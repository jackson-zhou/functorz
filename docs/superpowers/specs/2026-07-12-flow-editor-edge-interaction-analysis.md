# 事件流程编辑器 - 连线交互问题分析

## 问题背景

事件流程编辑器的连线交互问题反复出现，形成"修 A 出 B，修 B 出 C，修 C 出 A"的循环。本文档分析根本原因，并制定长期解决方案。

## 循环问题历史

| 迭代 | 修复的问题 | 引入的新问题 |
|------|-----------|-------------|
| 初始版本 | - | 无法双击添加弯折点，无法拖动端点 |
| v1 | 添加 vertices/source-anchor/target-anchor 工具 | 单击就加弯折点（应为双击），无法整体拖动连线 |
| v2 | vertices 设 `addable:false`，改用 arrowhead 工具 | 双箭头（两端都有箭头），无法拖动端点改方向 |

## 根本原因分析

### 1. X6 工具系统的设计哲学冲突

X6 的 EdgeTool 系统是**增强型**设计：
- 工具是叠加在边上的**额外交互层**
- 工具不替代边的原有属性（如 `sourceMarker`/`targetMarker`）
- 工具渲染的图形与边的图形**并存**

这导致：
- 边已有 `targetMarker: { name: 'block' }` 渲染箭头
- 添加 `target-arrowhead` 工具后，在同一位置又渲染一个箭头
- 添加 `source-arrowhead` 工具后，在 source 端也渲染一个箭头（但原始边没有 sourceMarker）
- 结果：**source 端出现不该有的箭头，target 端有两个箭头重叠**

### 2. 事件处理链复杂

X6 的事件处理涉及多层：
1. **工具层**：每个工具有自己的事件处理（`onMouseDown`, `onMouseMove`, `onMouseUp`）
2. **边视图层**：`edgeView` 处理边的通用事件
3. **画布层**：`graph` 处理全局事件
4. **自定义层**：应用代码添加的事件处理（如 `edge:mousedown`, `edge:dblclick`）

问题：
- 工具的 `stopPropagation` 会阻止事件传递到边视图和画布
- 自定义事件处理与工具事件处理可能同时触发，导致冲突
- 事件的触发顺序不确定，导致行为不一致

### 3. 状态管理分散

连线的状态分散在多处：
- **边的属性**：`source`, `target`, `sourceMarker`, `targetMarker`, `vertices`
- **工具状态**：工具是否显示、工具的手柄位置
- **选中状态**：`selectedEdge`（React state）
- **拖动状态**：`edgeDrag`（局部变量）

问题：
- 状态同步困难，容易出现不一致
- 工具的状态变化不会自动反映到边的属性
- 自定义拖动状态与工具状态可能冲突

### 4. 需求与 X6 默认行为不匹配

| 需求 | X6 默认行为 | 冲突点 |
|------|------------|--------|
| 双击添加弯折点 | vertices 工具单击添加 | `addable: true` + `mousedown` 监听 |
| 拖动端点脱离节点重连 | arrowhead 工具可拖动，但受 `restrictArea` 限制 | `restrictArea: true` 限制在节点内 |
| 只有一端有箭头（target） | arrowhead 工具两端都渲染 | source-arrowhead 和 target-arrowhead 独立渲染 |
| 整体拖动连线 | edgeMovable: true 时整体拖动 | 与工具的事件处理冲突 |

## 解决方案

### 方案 A：完全自定义（推荐）

**原则**：X6 工具仅用于顶点管理，端点交互完全自定义。

**实现**：
1. **顶点工具**：`vertices` 工具设 `addable: false, stopPropagation: false`
   - 仅用于显示和拖动已有顶点
   - 双击添加顶点由自定义 `edge:dblclick` 处理
2. **端点拖动手柄**：自定义 SVG 手柄，不用 arrowhead 工具
   - 在 source/target 位置渲染小圆圈
   - 自定义 `mousedown`/`mousemove`/`mouseup` 处理
   - 拖动时调用 `edge.setSource()`/`edge.setTarget()`
3. **整体拖动**：保留自定义 `edge:mousedown` 处理
4. **箭头样式**：保留边的 `targetMarker`，不添加 arrowhead 工具

**优点**：
- 完全可控，行为一致
- 避免工具与边的属性冲突
- 事件处理链清晰

**缺点**：
- 代码量较大
- 需要自己处理拖动逻辑

### 方案 B：完全用 X6 工具

**原则**：接受 X6 默认行为，调整需求匹配工具。

**实现**：
1. **移除所有自定义拖动逻辑**：删除 `edge:mousedown`, `handleEdgeMouseMove`, `handleEdgeMouseUp`
2. **vertices 工具**：`addable: true`（接受单击添加顶点）
3. **arrowhead 工具**：仅用 `target-arrowhead`，不用 `source-arrowhead`
4. **边的样式**：移除 `targetMarker`，让工具负责渲染箭头
5. **interacting**：设 `arrowheadMovable: true, vertexAddable: true`

**优点**：
- 代码量少
- 利用 X6 内置功能

**缺点**：
- 必须接受单击添加顶点（不能改成双击）
- arrowhead 拖动行为由 X6 控制，可能不符合预期
- 仍可能有工具与边的属性冲突

### 方案 C：混合方案（当前尝试）

**原则**：用 X6 工具，但配置为"被动"模式，自定义交互逻辑。

**实现**：
1. **vertices 工具**：`addable: false, stopPropagation: false`
2. **arrowhead 工具**：仅用于端点拖动，不渲染箭头（自定义 `attrs` 隐藏箭头）
3. **自定义拖动**：保留 `edge:mousedown` 处理整体拖动
4. **箭头样式**：保留边的 `targetMarker`

**问题**：
- arrowhead 工具的 `attrs` 只能改样式，不能完全隐藏
- `source-arrowhead` 和 `target-arrowhead` 是独立的，无法只启用拖动而不渲染
- 仍然有工具与边的属性冲突

**结论**：混合方案不可行，会导致更多问题。

## 推荐实施

采用**方案 A**，分步实施：

### Phase 1：移除 arrowhead 工具
- 只保留 `vertices` 工具（`addable: false, stopPropagation: false`）
- 恢复 `edge:dblclick` 添加顶点

### Phase 2：自定义端点手柄
- 在 `edge:click` 时，除了 vertices 工具，添加自定义手柄
- 手柄用 `edge.addTools([{ name: 'button', ... }])` 或自定义 SVG
- 手柄的拖动逻辑调用 `edge.setSource()`/`edge.setTarget()`

### Phase 3：验证和调优
- 测试各种场景：选中、拖动端点、拖动整体、添加/删除顶点
- 确保没有事件冲突

## 经验教训

1. **不要混用工具和自定义逻辑**：要么完全用工具，要么完全自定义
2. **理解 X6 的设计哲学**：工具是增强型，不是替代型
3. **事件处理链要清晰**：明确哪一层处理哪种事件
4. **状态管理要集中**：边的状态应该只在一处管理
5. **先写设计文档再编码**：避免循环修复
