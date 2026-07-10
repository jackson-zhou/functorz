# 事件流程编辑器设计文档

## 1. 概述

为低代码平台增加图化事件流程编辑器，支持用户为按钮组件绑定点击事件（tap），并通过拖拽式流程图编排事件处理逻辑。

## 2. 目标

- MVP 版本：支持 tap 点击事件 + 基础流程节点
- 可视化拖拽编辑：节点拖拽、连线、属性配置
- 数据持久化：流程定义存入项目 JSON
- 预留扩展：支持更多事件类型和节点类型

## 3. 数据结构设计

### 3.1 Flow 流程定义（packages/schema）

```typescript
// 流程节点类型 - MVP 核心类型
export type FlowNodeType = 
  | 'start'      // 开始节点
  | 'end'        // 结束节点
  | 'api'        // 调用接口
  | 'alert'      // 通知提示
  | 'navigate'   // 页面跳转
  | 'condition'  // 条件分支

// 流程节点
export interface FlowNode {
  id: string
  type: FlowNodeType
  label: string
  position: { x: number; y: number }
  config: NodeConfig
}

// 节点配置
export type NodeConfig = 
  | ApiConfig 
  | AlertConfig 
  | NavigateConfig 
  | ConditionConfig

// API 调用配置
export interface ApiConfig {
  url: string
  method: 'GET' | 'POST'
  params?: Record<string, string>
}

// 弹窗提示配置
export interface AlertConfig {
  type: 'success' | 'error' | 'info'
  message: string
}

// 页面跳转配置
export interface NavigateConfig {
  pageId: string
  params?: Record<string, string>
}

// 条件分支配置
export interface ConditionConfig {
  rules: ConditionRule[]
  logic: 'and' | 'or'
}

// 条件规则
export interface ConditionRule {
  field: string
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains'
  value: string
}

// 流程连线
export interface FlowEdge {
  id: string
  source: string
  target: string
  label?: string  // 条件标签："是"/"否"
}

// 完整流程定义
export interface Flow {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

// 扩展 ComponentNode
export interface ComponentNode {
  // ... 现有字段
  events?: {
    tap?: Flow
  }
}
```

## 4. UI 设计

### 4.1 右侧属性面板扩展

现有：`[页面, 属性]` Tab

扩展后：`[属性, 交互, 数据]` Tab

**交互 Tab 内容：**
- 事件类型：下拉选择（默认 tap，MVP 仅支持 tap）
- 状态显示："未绑定" / "已绑定 (3个步骤)"
- 操作按钮："编辑流程" / "清除绑定"

### 4.2 流程编辑器弹窗

```
┌─────────────────────────────────────────────────────────────┐
│  事件流程编辑器                                    [×]      │
├────────────┬───────────────────────────┬────────────────────┤
│            │                           │                    │
│  节点面板  │        画布区域           │    属性配置        │
│            │      (@antv/x6)          │                    │
│ ┌────────┐ │                           │  ┌──────────────┐  │
│ │  API   │ │  ○→☐→◇→☐→○              │  │ 节点名称     │  │
│ ├────────┤ │                           │  ├──────────────┤  │
│ │  提示  │ │                           │  │ 配置项1      │  │
│ ├────────┤ │                           │  │ 配置项2      │  │
│ │  跳转  │ │                           │  │ ...          │  │
│ ├────────┤ │                           │  └──────────────┘  │
│ │  分支  │ │                           │                    │
│ └────────┘ │                           │                    │
│            │                           │                    │
└────────────┴───────────────────────────┴────────────────────┘
│  [取消]                                      [保存]          │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 节点面板分类

| 分类 | 节点类型 | 图标 | 说明 |
|-----|---------|------|-----|
| **基础操作** | api | 🔌 | 调用后端接口 |
| | alert | 💬 | 弹出提示框 |
| | navigate | ➡️ | 页面跳转 |
| **控制流** | condition | ◇ | 条件判断分支 |

## 5. 技术实现

### 5.1 依赖选择

- **图编辑库**：`@antv/x6` ^2.18.1
  - 中文文档完善
  - 适合业务流程图
  - 支持自定义节点渲染
  - 拖拽、缩放、连线能力完善

### 5.2 文件结构

```
apps/studio/src/
  ├── App.tsx                    # 扩展右侧 Tab，增加交互面板
  ├── components/
  │   ├── FlowEditorModal.tsx    # 流程编辑器弹窗（主组件）
  │   ├── FlowNodePalette.tsx    # 左侧节点面板
  │   ├── FlowPropertyPanel.tsx  # 右侧属性配置
  │   └── flow-nodes/            # 自定义节点渲染
  │       ├── StartNode.tsx
  │       ├── EndNode.tsx
  │       ├── ApiNode.tsx
  │       ├── AlertNode.tsx
  │       ├── NavigateNode.tsx
  │       └── ConditionNode.tsx
  └── hooks/
      └── useFlowEditor.ts       # 流程编辑逻辑 hook

packages/schema/src/
  └── index.ts                   # 扩展 Flow 类型定义
```

### 5.3 实现步骤

1. **Schema 扩展** - 在 packages/schema 中增加 Flow 相关类型和 Zod Schema
2. **安装依赖** - `pnpm --filter studio add @antv/x6`
3. **编辑器弹窗框架** - FlowEditorModal 基础布局 + X6 画布初始化
4. **节点面板** - 可拖拽节点列表 + 拖拽添加到画布
5. **自定义节点** - 各类型节点的 X6 注册和渲染
6. **属性面板** - 选中节点后动态渲染配置表单
7. **集成到属性面板** - App.tsx 右侧增加"交互"Tab
8. **数据读写** - 流程数据保存/读取到 project JSON
9. **样式优化** - 与现有 UI 风格统一

## 6. 边界与约束

### MVP 范围
- ✅ 只支持 tap 点击事件
- ✅ 只支持 Button 组件绑定事件
- ✅ 基础节点类型：start/end/api/alert/navigate/condition
- ✅ 不包含实际运行时执行引擎（仅 UI + 数据存储）

### 非 MVP 范围
- ❌ 其他事件类型（longpress、input 等）
- ❌ 流程执行引擎（runtime 侧）
- ❌ 复杂表达式编辑
- ❌ 子流程/复用流程

## 7. 后续扩展方向

1. **事件类型扩展**：支持 longpress、touchstart、change 等
2. **节点类型扩展**：表单提交、变量赋值、数据转换等
3. **流程执行引擎**：runtime 侧实现流程图解释执行
4. **流程模板**：常用流程可保存为模板复用
5. **调试能力**：流程模拟运行、断点、日志
