# 事件流程编辑器 - 连线交互问题修复记录

**日期**: 2026-07-12  
**文件**: `apps/studio/src/components/FlowEditorModal.tsx`  
**问题**: 连线交互问题循环出现（修 A 出 B，修 B 出 C）

---

## 问题现象

用户报告的三个核心问题：

1. **单击变折线**：单击连线就添加弯折点，期望是双击添加
2. **无法移动箭头**：选中连线后无法整体拖动
3. **无法脱离节点**：无法拖动端点改变连接方向
4. **双箭头**：选中连线后两端都显示箭头（期望只有 target 端有箭头）

---

## 根本原因分析

### 原因 1：X6 工具的设计哲学

X6 的 EdgeTool 是**增强型**设计：
- 工具叠加在边的原有属性之上，不是替代
- 工具渲染的图形与边的图形**并存**
- 导致：边已有 `targetMarker`，再加 `target-arrowhead` 工具 = 两个箭头重叠

### 原因 2：事件处理链冲突

- `vertices` 工具默认 `stopPropagation: true`，吃掉 `edge:mousedown` 事件
- 自定义的 `edge:mousedown` 处理程序无法触发
- 导致：无法启动自定义的整体拖动

### 原因 3：工具配置与需求不匹配

| 需求 | X6 默认 | 冲突 |
|------|--------|------|
| 双击加弯折点 | `vertices` 单击加 (`addable: true`) | 需设 `addable: false` |
| 只有一端箭头 | `arrowhead` 工具两端独立渲染 | 需只用 `target-arrowhead` |
| 拖动端点脱离节点 | `anchor` 工具限制在节点内 (`restrictArea: true`) | 需设 `restrictArea: false` |

---

## 修复步骤

### 步骤 1：修改 `interacting` 配置

**位置**: 第 206-213 行

```typescript
interacting: {
  edgeLabelMovable: true,
  edgeMovable: false,
  vertexMovable: true,
  vertexAddable: true,
  vertexDeletable: true,
  arrowheadMovable: true,  // ← 新增：允许箭头端点拖动
},
```

**说明**: 启用 `arrowheadMovable`，允许 arrowhead 工具拖动端点。

---

### 步骤 2：添加 `edge:dblclick` 处理程序

**位置**: 第 239-249 行

```typescript
// 双击连线添加弯折点（vertices 工具 addable=false，由 dblclick 手动添加）
graph.on('edge:dblclick', ({ edge, x, y }: { edge: Edge; x: number; y: number }) => {
  const vertices = edge.getVertices()
  let insertIndex = vertices.length
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i]
    const dist = Math.sqrt(Math.pow(v.x - x, 2) + Math.pow(v.y - y, 2))
    if (dist < 30) return  // 太近不添加
  }
  edge.insertVertex({ x, y }, insertIndex)
})
```

**说明**: 
- 恢复双击添加弯折点的功能
- 检查距离已有弯折点太近时不添加（避免重叠）
- 因为 `vertices` 工具设了 `addable: false`，不会在单击时添加

---

### 步骤 3：修改 `edge:click` 中的工具配置

**位置**: 第 268-292 行（2026-07-12 更新：改用 arrowhead 工具）

```typescript
// 高亮当前连线，添加顶点和端点拖拽工具（用 arrowhead 工具处理拖动和磁吸）
edge.attr('line/stroke', '#1890ff')
edge.attr('line/strokeWidth', 3)
edge.addTools([
  {
    name: 'vertices',
    args: {
      addable: false,           // ← 关键：禁用单击添加顶点
      stopPropagation: false,   // ← 关键：允许事件冒泡到 edge:mousedown
      attrs: { fill: '#1890ff', stroke: '#1890ff' },
    },
  },
  {
    name: 'source-arrowhead',   // ← 用 arrowhead 工具，支持脱离节点和磁吸
    args: {
      attrs: {
        d: 'M -5 -5 m 5 0 a 5 5 0 1 0 0 10 a 5 5 0 1 0 0 -10',  // 圆圈路径
        fill: '#1890ff',
        stroke: '#fff',
        'stroke-width': 2,
        cursor: 'pointer',
      },
    },
  },
  {
    name: 'target-arrowhead',
    args: {
      attrs: {
        d: 'M -5 -5 m 5 0 a 5 5 0 1 0 0 10 a 5 5 0 1 0 0 -10',  // 圆圈路径（避免与 targetMarker 重叠）
        fill: '#1890ff',
        stroke: '#fff',
        'stroke-width': 2,
        cursor: 'pointer',
      },
    },
  },
])
```

**关键改动**:
1. `vertices` 工具：
   - `addable: false` → 禁用单击添加顶点
   - `stopPropagation: false` → 允许 `edge:mousedown` 触发
2. 端点工具：
   - 用 `source-arrowhead`/`target-arrowhead` 替代 `source-anchor`/`target-anchor`
   - 自定义 `attrs.d` 为圆圈路径（`M -5 -5 m 5 0 a 5 5 0 1 0 0 10 a 5 5 0 1 0 0 -10`）
   - arrowhead 工具支持拖动脱离节点，且有内置磁吸逻辑

**为什么用 arrowhead 工具**:
- `arrowhead` 工具的拖动逻辑由 X6 内置处理，支持脱离节点（source/target 从节点 ID 变为坐标）
- `arrowhead` 工具有内置磁吸逻辑，靠近节点/端口时自动吸附
- 自定义 `attrs.d` 为圆圈，避免与边的 `targetMarker` 冲突（双箭头问题）

---

### 步骤 4：修改 `edge:mousedown` 判断逻辑

**位置**: 第 306-313 行

```typescript
graph.on('edge:mousedown', ({ edge, x, y, e }: { edge: Edge; x: number; y: number; e: MouseEvent }) => {
  // 点击工具手柄（顶点圆圈、端点锚点）时不启动整体拖动
  const target = e?.target as SVGElement | undefined
  if (target?.closest('.x6-edge-tools')) return  // ← 改用 class 判断，而非 tagName
  edgeDrag = { edge, startX: x, startY: y, lastX: x, lastY: y, detached: false }
  graph.disablePanning()
})
```

**改动说明**:
- 旧逻辑：`target.tagName !== 'path' && target.tagName !== 'line'`
  - 问题：`arrowhead` 工具也渲染 `<path>`，会被误判为线条本体
- 新逻辑：`target?.closest('.x6-edge-tools')`
  - X6 工具都渲染在 `.x6-edge-tools` 容器内
  - 线条本体在容器外，不会被匹配
  - 更精确区分工具和线条

---

## 最终效果

| 操作 | 行为 | 状态 |
|------|------|------|
| 单击连线 | 选中，高亮蓝色，显示工具手柄 | ✅ |
| 双击连线 | 添加弯折点 | ✅ |
| 拖动弯折点 | 改变弯折位置 | ✅（vertices 工具） |
| 拖动连线本体 | 整体移动连线 | ✅（自定义 edge:mousedown） |
| 拖动端点圆圈 | 改变端点位置，可拖出节点，靠近节点时磁吸 | ✅（arrowhead 工具） |
| 端点箭头显示 | 只有 target 端有箭头（边的 targetMarker），source 端是圆圈手柄 | ✅（自定义 arrowhead 的 attrs.d 为圆圈） |

---

## 遗留问题

暂无。所有已知问题已解决：
- ✅ 双击添加弯折点（不是单击）
- ✅ 拖动连线本体可整体移动
- ✅ 拖动端点可脱离节点
- ✅ 端点靠近节点时磁吸
- ✅ 只有 target 端有箭头（无双箭头）

---

## 经验教训

### 1. 不要混用工具和自定义逻辑

- **错误做法**: 用 X6 工具处理一部分交互，自定义逻辑处理另一部分
- **问题**: 事件处理链冲突，状态管理分散
- **正确做法**: 要么完全用工具，要么完全自定义

### 2. 理解 X6 工具的设计哲学

- X6 工具是**增强型**，不是**替代型**
- 工具渲染的图形与边的原有图形**并存**
- 如果边的属性（如 `targetMarker`）和工具（如 `target-arrowhead`）都渲染相同元素 → 重复

### 3. 事件处理链要清晰

- 工具的 `stopPropagation` 会阻止事件传递
- 自定义事件处理程序要与工具的事件处理协调
- 用 `closest()` 判断事件目标是否在工具容器内，比判断 tagName 更可靠

### 4. 状态管理要集中

- 边的状态（source, target, vertices, markers）应该只在一处管理
- 工具的状态变化应该同步到边的属性
- 避免 React state、局部变量、边属性多处分散

### 5. 先写设计文档再编码

- 本次修复循环出现问题的根本原因：没有先分析清楚就编码
- 正确流程：问题分析 → 方案设计 → 文档评审 → 编码实现 → 测试验证

---

## 相关文件

- 问题分析文档：`docs/superpowers/specs/2026-07-12-flow-editor-edge-interaction-analysis.md`
- 修复文件：`apps/studio/src/components/FlowEditorModal.tsx`
- 测试页面：http://111.207.40.188:1000

---

## 后续优化建议

### 短期（P0）
- [x] 验证 arrowhead 工具支持脱离节点拖动 ✅
- [x] 验证 arrowhead 工具内置磁吸功能 ✅

### 中期（P1）
- [ ] 添加端到端测试，覆盖所有交互场景
- [ ] 优化 arrowhead 手柄的视觉样式（大小、颜色）
- [ ] 文档化 arrowhead 工具的 attrs.d 路径语法

### 长期（P2）
- [ ] 评估是否完全自定义连线交互（不依赖 X6 工具）
- [ ] 或完全接受 X6 默认行为，调整产品需求

---

**最后更新**: 2026-07-12  
**作者**: Functorz Team
