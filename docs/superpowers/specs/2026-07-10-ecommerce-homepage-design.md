# 电商首页组件设计文档

## 1. 概述

本文档描述低代码平台（functorz）电商首页相关组件的设计方案，包括：
- DataProvider：数据容器组件，统一发起 API 请求并向下传递数据
- KingKongList：金刚位组件，图标+文字网格布局
- ProductGrid：商品网格组件，2列瀑布流布局

## 2. 背景与目标

### 2.1 背景
淘宝首页样式的电商首页需要：
- 顶部搜索栏
- Tab 标签页切换
- 金刚位入口（图标+文字网格）
- 商品列表（2列网格）
- 所有数据从服务端动态获取

### 2.2 目标
- 组件化：每个功能模块独立为可复用组件
- 数据驱动：通过 API 动态获取数据并渲染
- 低代码友好：可视化拖拽配置，无需编码

## 3. 核心设计

### 3.1 架构图

```
Page (首页)
└── DataProvider (数据容器)
    ├── SearchBar (搜索栏)
    ├── Tabs (标签页)
    │   └── Section (每个 Tab 的内容区)
    │       ├── KingKongList (金刚位)
    │       └── ProductGrid (商品网格)
    └── BottomNav (底部导航)
```

### 3.2 数据流向

```
Page mount
    ↓
DataProvider 初始化
    ↓
并行请求 API1 (金刚位数据) + API2 (商品列表数据)
    ↓
数据聚合到 React Context
    ↓
├─ KingKongList 读取 Context 渲染
└─ ProductGrid 读取 Context 渲染
```

## 4. 组件详细设计

### 4.1 DataProvider 数据容器

**组件类型：** `DataProvider`
**分类：** layout
**容器：** 是

**Props：**
| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `apis` | string | 是 | `[]` | JSON 数组，配置多个 API 端点 |
| `dataKey` | string | 否 | `homeData` | 数据注入到 context 的键名 |

**API 配置格式：**
```json
[
  {
    "key": "kingkong",
    "url": "https://api.example.com/kingkong",
    "method": "GET"
  },
  {
    "key": "products",
    "url": "https://api.example.com/products",
    "method": "GET"
  }
]
```

**功能说明：**
1. 组件 mount 时并行请求所有配置的 API
2. 将每个 API 的响应数据按 `key` 聚合到 context
3. Loading 状态下显示骨架屏占位符
4. 请求失败时显示错误状态和重试按钮
5. 通过 React Context 向下传递数据给子组件

### 4.2 KingKongList 金刚位组件

**组件类型：** `KingKongList`
**分类：** content
**容器：** 否

**Props：**
| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `dataSource` | string | 是 | - | 数据绑定表达式（如 `${homeData.kingkong.list}`） |
| `columns` | number | 否 | `5` | 网格列数 |
| `iconSize` | number | 否 | `44` | 图标尺寸（px） |

**数据结构：**
```typescript
interface KingKongItem {
  icon: string;      // 图标 URL
  text: string;      // 文字标签
  url?: string;      // 跳转链接（可选）
  badge?: string;    // 右上角角标（可选）
}
```

**功能说明：**
1. 从 DataProvider 的 Context 中获取数据
2. 渲染图标+文字的网格布局
3. 支持点击跳转（通过 action 系统）
4. 数据加载中显示占位符骨架屏

### 4.3 ProductGrid 商品网格组件

**组件类型：** `ProductGrid`
**分类：** content
**容器：** 否

**Props：**
| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `dataSource` | string | 是 | - | 数据绑定表达式（如 `${homeData.products.list}`） |
| `columns` | number | 否 | `2` | 网格列数 |
| `gap` | string | 否 | `12px` | 卡片间距 |

**数据结构：**
```typescript
interface ProductItem {
  image: string;      // 商品图片 URL
  name: string;       // 商品名称
  price: string;      // 售价
  originalPrice?: string;  // 原价（划线价，可选）
  tag?: string;       // 标签文字（可选）
  sales?: string;     // 已售数量（可选）
  url?: string;       // 跳转链接（可选）
}
```

**功能说明：**
1. 从 DataProvider 的 Context 中获取数据
2. 渲染 2 列网格布局的商品卡片
3. 商品卡片样式与现有 ProductCard 保持一致
4. 支持点击跳转商品详情

## 5. 底层能力增强

### 5.1 组件 Context 机制

新增 React Context 支持，允许容器组件向子组件跨层级传递数据：

1. 在 `runtime-renderer` 中新增 `ComponentContext`
2. DataProvider 作为 Provider，将数据注入 Context
3. 子组件通过 `useContext` 读取数据

### 5.2 表达式解析增强

支持 `${context.key}` 语法读取 context 数据：

1. 扩展现有表达式解析器
2. 支持 `context` 作为特殊变量名
3. 支持多级属性访问：`${context.homeData.kingkong.list}`

### 5.3 组件生命周期钩子

新增 `onMount` 生命周期钩子，用于组件首次渲染时触发 API 请求：

1. 在 ComponentNode 类型中新增 `events.onMount`
2. 在 NodeRenderer 中通过 useEffect 触发 onMount 事件流
3. 支持与现有的事件流系统（api、setData 等）集成

## 6. 错误处理与边界情况

### 6.1 加载状态
- DataProvider 请求期间显示骨架屏
- KingKongList 和 ProductGrid 渲染占位符卡片

### 6.2 错误处理
- API 请求失败时显示错误提示
- 提供重试按钮重新发起请求
- 单个 API 失败不影响其他组件渲染

### 6.3 空数据
- API 返回空数组时显示"暂无数据"提示
- 保持布局占位，不破坏页面结构

## 7. 实现计划

### 阶段一：底层能力（1天）
1. 新增 ComponentContext 机制
2. 增强表达式解析器支持 context
3. 实现 onMount 生命周期钩子

### 阶段二：DataProvider 组件（1天）
1. 在 schema 中注册 DataProvider 类型
2. 实现组件注册与属性配置
3. 实现 API 并行请求与数据聚合逻辑
4. 实现加载与错误状态

### 阶段三：KingKongList 组件（0.5天）
1. 在 schema 中注册 KingKongList 类型
2. 实现组件注册与属性配置
3. 实现图标+文字网格布局
4. 实现数据绑定与占位符

### 阶段四：ProductGrid 组件（0.5天）
1. 在 schema 中注册 ProductGrid 类型
2. 实现组件注册与属性配置
3. 实现 2 列网格布局
4. 复用 ProductCard 渲染逻辑

## 8. 验证标准

1. ✅ DataProvider 可配置多个 API 并并行请求
2. ✅ 数据通过 Context 正确传递给子组件
3. ✅ KingKongList 正确渲染图标+文字网格（5列）
4. ✅ ProductGrid 正确渲染商品卡片网格（2列）
5. ✅ 加载状态与错误状态正确显示
6. ✅ 所有组件可在可视化编辑器中拖拽配置
