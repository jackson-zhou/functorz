# 登录页 & 电商首页设计文档

## 1. 概述

为低代码平台新增两个标准页面模板：**登录页** 和 **电商首页**，用于展示平台的组件化页面搭建能力。

**设计原则：** 页面上的每一个视觉元素都必须由组件（ComponentNode）构成。若现有组件库缺少所需组件，必须先创建组件定义，再组装页面。

## 2. 组件清单

### 2.1 现有可用组件（17 个）

| 组件 | 类别 | 容器 | 接受子组件 | 用途 |
|------|------|------|------------|------|
| Page | layout | 是 | any | 页面根节点 |
| Section | layout | 是 | any | 通用区块 |
| Flex | layout | 是 | any | 弹性布局（direction/justify/align/wrap） |
| Grid | layout | 是 | any | 网格布局 |
| Card | layout | 是 | any | 卡片容器 |
| Text | content | 否 | — | 文字 |
| Image | content | 否 | — | 图片 |
| Button | content | 否 | — | 按钮（variant: primary/text） |
| Divider | content | 否 | — | 分割线 |
| Spacer | layout | 否 | — | 间距（size: xs/sm/md/lg/xl） |
| Swiper | layout | 是 | Section, Image | 轮播 |
| Form | form | 是 | Input, Button, Section, Text | 表单 |
| Input | form | 否 | — | 输入框（name/label/placeholder/required/icon） |
| Tabs | layout | 是 | Section, Flex, Grid, Card | 标签页 |
| Badge | content | 否 | — | 徽章 |
| Tag | content | 否 | — | 标签 |
| FAB | content | 否 | — | 浮动按钮 |

### 2.2 已废弃组件（3 个）

| 组件 | 原用途 | 处理方式 |
|------|--------|----------|
| AppHeader | 小程序标题栏 | 不在此次范围内使用 |
| PetCard | 活体卡片 | 电商首页中替代为新建 ProductCard |
| BottomNav | 底部导航 | **重新设计**，移除 deprecated 标记 |

### 2.3 需新建组件（4 个）

| 组件 | 类别 | 优先级 | 说明 |
|------|------|--------|------|
| **SearchBar** | content | P0 | 搜索栏，含搜索输入框和按钮 |
| **ProductCard** | content | P0 | 商品卡片，展示图片/名称/价格/标签 |
| **Countdown** | content | P1 | 倒计时，用于秒杀等场景 |
| **BottomNav** | layout | P0 | 底部导航栏（重新设计原废弃组件） |

### 2.4 需修改的现有组件（1 个）

| 组件 | 修改内容 |
|------|----------|
| **Input** | 新增 `inputType` 属性（text/password/number/tel/email），支持密码输入框 |

---

## 3. 新组件定义

### 3.1 Input 修改

在现有 Input 组件属性中新增 `inputType` 字段：

```typescript
Input: def({
  type: 'Input',
  label: '输入框',
  category: 'form',
  container: false,
  defaultProps: { name: 'field', label: '字段', placeholder: '请输入', inputType: 'text' },
  properties: [
    { key: 'name', label: '字段名', kind: 'text', required: true },
    { key: 'label', label: '标签', kind: 'text', required: true },
    { key: 'placeholder', label: '占位文字', kind: 'text' },
    { key: 'required', label: '必填', kind: 'boolean' },
    { key: 'inputType', label: '输入类型', kind: 'select', options: ['text', 'password', 'number', 'tel', 'email'] },
    { key: 'icon', label: '图标', kind: 'select', options: ['none', 'search'] },
  ],
}),
```

**影响范围：**
- `packages/component-registry/src/index.ts` — 修改 Input 定义
- `packages/schema/src/index.ts` — 无需修改（props 为 Record<string, unknown>）
- `packages/runtime-renderer/src/index.tsx` — 渲染 Input 时根据 `inputType` 设置 `<input type="...">`
- `apps/studio/src/App.tsx` — 属性面板自动展示新字段

### 3.2 SearchBar

```typescript
SearchBar: def({
  type: 'SearchBar',
  label: '搜索栏',
  category: 'content',
  container: false,
  defaultProps: { placeholder: '搜索商品', showButton: true, buttonText: '搜索' },
  properties: [
    { key: 'placeholder', label: '占位文字', kind: 'text' },
    { key: 'showButton', label: '显示搜索按钮', kind: 'boolean' },
    { key: 'buttonText', label: '按钮文字', kind: 'text' },
  ],
}),
```

**渲染效果：** 一个圆角搜索框（左侧搜索图标 + 输入区域），右侧可选搜索按钮。

**影响范围：**
- `packages/component-registry/src/index.ts` — 新增 SearchBar 定义
- `packages/schema/src/index.ts` — `componentTypes` 数组新增 `'SearchBar'`，`leaves` 集合新增 `'SearchBar'`
- `packages/runtime-renderer/src/index.tsx` — 新增 SearchBar 渲染逻辑
- `apps/studio/src/App.tsx` — 组件面板自动展示

### 3.3 ProductCard

```typescript
ProductCard: def({
  type: 'ProductCard',
  label: '商品卡片',
  category: 'content',
  container: false,
  defaultProps: {
    name: '商品名称',
    price: '99.00',
    originalPrice: '',
    image: 'https://placehold.co/300x300',
    tag: '',
    sales: '',
  },
  properties: [
    { key: 'name', label: '商品名称', kind: 'text', required: true },
    { key: 'price', label: '售价', kind: 'text', required: true },
    { key: 'originalPrice', label: '原价（划线价）', kind: 'text' },
    { key: 'image', label: '商品图片', kind: 'url', required: true },
    { key: 'tag', label: '标签文字', kind: 'text' },
    { key: 'sales', label: '已售数量', kind: 'text' },
  ],
}),
```

**渲染效果：** 卡片式布局，顶部商品图片（正方形），下方商品名称（最多两行），价格行（售价红色大字 + 原价灰色删除线），可选标签和销量。

**影响范围：**
- `packages/component-registry/src/index.ts` — 新增 ProductCard 定义
- `packages/schema/src/index.ts` — `componentTypes` 新增 `'ProductCard'`，`leaves` 新增 `'ProductCard'`
- `packages/runtime-renderer/src/index.tsx` — 新增 ProductCard 渲染逻辑
- `apps/studio/src/App.tsx` — 组件面板自动展示

### 3.4 Countdown

```typescript
Countdown: def({
  type: 'Countdown',
  label: '倒计时',
  category: 'content',
  container: false,
  defaultProps: { label: '距结束', deadline: '' },
  properties: [
    { key: 'label', label: '提示文字', kind: 'text' },
    { key: 'deadline', label: '截止时间（ISO 8601）', kind: 'text' },
  ],
}),
```

**渲染效果：** 显示 "距结束 HH:MM:SS" 格式的倒计时。预览态显示静态示例（如 "距结束 02:30:00"），运行时根据 `deadline` 实时计算。

**影响范围：**
- `packages/component-registry/src/index.ts` — 新增 Countdown 定义
- `packages/schema/src/index.ts` — `componentTypes` 新增 `'Countdown'`，`leaves` 新增 `'Countdown'`
- `packages/runtime-renderer/src/index.tsx` — 新增 Countdown 渲染逻辑（含实时计时）
- `apps/studio/src/App.tsx` — 组件面板自动展示

### 3.5 BottomNav（重新设计）

```typescript
BottomNav: def({
  type: 'BottomNav',
  label: '底部导航',
  category: 'layout',
  container: false,
  // 移除 deprecated: true
  defaultProps: {
    items: '["首页","分类","购物车","我的"]',
    activeIndex: 0,
  },
  properties: [
    { key: 'items', label: '导航项（JSON 数组）', kind: 'textarea', required: true },
    { key: 'activeIndex', label: '默认激活索引', kind: 'number' },
  ],
}),
```

**变更说明：** 
- 移除 `deprecated: true`
- `items` 格式从逗号分隔字符串改为 JSON 字符串数组 `["首页","分类","购物车","我的"]`
- `active` 属性改为 `activeIndex`（数字），与 Tabs 组件保持一致
- 后续可扩展支持图标（JSON 对象数组 `[{"label":"首页","icon":"home"}]`）

**向后兼容：** 已有项目使用旧格式的 BottomNav 数据，需要编写迁移逻辑（旧 `items: "首页,分类"` → 新 `items: '["首页","分类"]'`）。

**影响范围：**
- `packages/component-registry/src/index.ts` — 修改 BottomNav 定义
- `packages/schema/src/index.ts` — 无需修改（`'BottomNav'` 已在 componentTypes 中）
- `packages/runtime-renderer/src/index.tsx` — 更新 BottomNav 渲染逻辑
- `apps/studio/src/App.tsx` — 属性面板自动展示新字段

---

## 4. 登录页设计

### 4.1 页面信息

| 属性 | 值 |
|------|-----|
| 页面名称 | 登录页 |
| 路由 | `/login` |
| 设计尺寸 | 390 × 844 px |

### 4.2 组件树

```
Page
└── Flex (direction: column, alignItems: center, padding*: 32)
    ├── Spacer (size: xl)
    ├── Image (logo, src: logo.png, width: 80, height: 80)
    ├── Spacer (size: md)
    ├── Text (标题, text: "欢迎回来", fontSize: lg, fontWeight: bold, textAlign: center)
    ├── Spacer (size: sm)
    ├── Text (副标题, text: "请输入账号信息登录", fontSize: sm, color: #85869a)
    ├── Spacer (size: xl)
    ├── Form
    │   ├── Input (name: phone, label: 手机号, placeholder: 请输入手机号, inputType: tel, required: true)
    │   ├── Input (name: password, label: 密码, placeholder: 请输入密码, inputType: password, required: true)
    │   └── Button (text: 登录, variant: primary)
    ├── Spacer (size: md)
    ├── Flex (direction: row, justifyContent: space-between, width: 100%)
    │   ├── Text (text: "忘记密码?", fontSize: sm, color: #6d5dfc)
    │   └── Text (text: "注册账号", fontSize: sm, color: #6d5dfc)
    ├── Spacer (size: lg)
    ├── Divider
    ├── Spacer (size: md)
    ├── Text (text: "其他登录方式", fontSize: sm, color: #85869a)
    ├── Spacer (size: sm)
    └── Flex (direction: row, justifyContent: center, gap: md)
        ├── Button (text: "微信登录", variant: text)
        └── Button (text: "短信验证", variant: text)
```

### 4.3 视觉布局

```
┌──────────────────────────────┐
│                              │
│         [ Logo 80x80 ]       │
│                              │
│         欢迎回来              │
│     请输入账号信息登录         │
│                              │
│  ┌────────────────────────┐  │
│  │ 手机号                  │  │
│  │ ┌────────────────────┐ │  │
│  │ │ 请输入手机号         │ │  │
│  │ └────────────────────┘ │  │
│  │                        │  │
│  │ 密码                   │  │
│  │ ┌────────────────────┐ │  │
│  │ │ 请输入密码   (●●●●) │ │  │
│  │ └────────────────────┘ │  │
│  │                        │  │
│  │ ┌────────────────────┐ │  │
│  │ │      登  录         │ │  │  ← primary 按钮
│  │ └────────────────────┘ │  │
│  └────────────────────────┘  │
│                              │
│  忘记密码?        注册账号    │
│                              │
│  ──────────────────────────  │
│                              │
│       其他登录方式            │
│                              │
│    [微信登录]  [短信验证]     │
│                              │
└──────────────────────────────┘
```

### 4.4 交互行为

| 元素 | 事件 | 行为 |
|------|------|------|
| 登录按钮 | tap | `submit` — 提交 Form 表单 |
| 忘记密码? | tap | `navigate` — 跳转忘记密码页 |
| 注册账号 | tap | `navigate` — 跳转注册页 |
| 微信登录 | tap | `navigate` — 微信授权登录 |
| 短信验证 | tap | `navigate` — 短信验证码登录 |

---

## 5. 电商首页设计

### 5.1 页面信息

| 属性 | 值 |
|------|-----|
| 页面名称 | 首页 |
| 路由 | `/home` |
| 设计尺寸 | 390 × 844 px |

### 5.2 组件树

```
Page
└── Flex (direction: column, backgroundColor: #f4f4f7)
    ├── Section (header, backgroundColor: primaryColor, padding*: 16)
    │   ├── Flex (top bar, direction: row, justifyContent: space-between, alignItems: center)
    │   │   ├── Text (location, text: "📍 北京", color: #ffffff, fontSize: sm)
    │   │   └── Flex (icons, direction: row, gap: sm)
    │   │       ├── Badge (message, text: "消息", variant: default)
    │   │       └── Badge (cart, text: "购物车", variant: default)
    │   └── SearchBar (placeholder: "搜索商品", showButton: true, buttonText: "搜索")
    │
    ├── Swiper (banner, autoplay: true, height: 180)
    │   ├── Image (banner1, src: banner1.jpg, objectFit: cover)
    │   ├── Image (banner2, src: banner2.jpg, objectFit: cover)
    │   └── Image (banner3, src: banner3.jpg, objectFit: cover)
    │
    ├── Section (category, backgroundColor: #ffffff, padding*: 16)
    │   ├── Grid (columns: 4, gap: md)
    │   │   ├── Flex (cat1, direction: column, alignItems: center)
    │   │   │   ├── Image (icon, width: 48, height: 48, radius: md)
    │   │   │   └── Text (name, text: "手机数码", fontSize: xs)
    │   │   ├── Flex (cat2, direction: column, alignItems: center)
    │   │   │   ├── Image (icon)
    │   │   │   └── Text (name, text: "服饰鞋包")
    │   │   ├── Flex (cat3, ...)
    │   │   │   ├── Image (icon)
    │   │   │   └── Text (name, text: "家电办公")
    │   │   ├── Flex (cat4, ...)
    │   │   │   ├── Image (icon)
    │   │   │   └── Text (name, text: "美妆护肤")
    │   │   ├── Flex (cat5, ...)
    │   │   │   ├── Image (icon)
    │   │   │   └── Text (name, text: "食品生鲜")
    │   │   ├── Flex (cat6, ...)
    │   │   │   ├── Image (icon)
    │   │   │   └── Text (name, text: "母婴玩具")
    │   │   ├── Flex (cat7, ...)
    │   │   │   ├── Image (icon)
    │   │   │   └── Text (name, text: "医药健康")
    │   │   └── Flex (cat8, ...)
    │   │       ├── Image (icon)
    │   │       └── Text (name, text: "更多")
    │   │   (8 个分类项)
    │   └── Spacer (size: sm)
    │
    ├── Spacer (size: sm)
    │
    ├── Section (flash sale, backgroundColor: #ffffff, padding*: 16, margin*: 0 8)
    │   ├── Flex (title row, direction: row, justifyContent: space-between, alignItems: center)
    │   │   ├── Flex (left, direction: row, alignItems: center, gap: sm)
    │   │   │   ├── Text (title, text: "限时秒杀", fontSize: md, fontWeight: bold)
    │   │   │   └── Countdown (label: "距结束", deadline: "2026-07-11T00:00:00+08:00")
    │   │   └── Text (more, text: "查看更多 >", fontSize: sm, color: #85869a)
    │   ├── Spacer (size: sm)
    │   └── Flex (products, direction: row, gap: sm)
    │       ├── ProductCard (name: "商品A", price: "29.90", originalPrice: "99.00", ...)
    │       ├── ProductCard (name: "商品B", price: "19.90", originalPrice: "59.00", ...)
    │       └── ProductCard (name: "商品C", price: "39.90", originalPrice: "129.00", ...)
    │
    ├── Spacer (size: sm)
    │
    ├── Section (recommend, backgroundColor: #ffffff, padding*: 16)
    │   ├── Flex (title row, direction: row, justifyContent: space-between, alignItems: center)
    │   │   ├── Text (title, text: "为你推荐", fontSize: md, fontWeight: bold)
    │   │   └── Text (more, text: "换一批 >", fontSize: sm, color: #85869a)
    │   ├── Spacer (size: sm)
    │   └── Grid (columns: 2, gap: sm)
    │       ├── ProductCard (product1, ...)
    │       ├── ProductCard (product2, ...)
    │       ├── ProductCard (product3, ...)
    │       └── ProductCard (product4, ...)
    │
    ├── Spacer (size: sm)
    │
    ├── Section (hot sale, backgroundColor: #ffffff, padding*: 16)
    │   ├── Text (title, text: "热销排行榜", fontSize: md, fontWeight: bold)
    │   ├── Spacer (size: sm)
    │   └── Grid (columns: 2, gap: sm)
    │       ├── ProductCard (hot1, ...)
    │       ├── ProductCard (hot2, ...)
    │       ├── ProductCard (hot3, ...)
    │       └── ProductCard (hot4, ...)
    │
    ├── Spacer (size: lg)  ← 为底部导航留空间
    │
    └── BottomNav (items: '["首页","分类","购物车","我的"]', activeIndex: 0,
                   style: { position: fixed, bottom: 0, width: 390 })
```

### 5.3 视觉布局

```
┌──────────────────────────────┐
│ ████████████████████████████ │ ← 头部（primaryColor 背景）
│  📍 北京         消息 购物车  │
│ ┌──────────────────────────┐ │
│ │ 🔍 搜索商品        [搜索] │ │ ← SearchBar
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │     Banner 轮播图         │ │ ← Swiper (180px)
│ │    [ 1 ] [ 2 ] [ 3 ]     │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ 📱手机   👗服饰   💻家电   💄美妆 │ ← 分类网格 (4列)
│ 🍖食品   👶母婴   💊医药   ···更多│
├──────────────────────────────┤
│ 限时秒杀  距结束 02:30:00  更多>│
│ ┌──────┐ ┌──────┐ ┌──────┐  │
│ │ 商品A │ │ 商品B │ │ 商品C │  │ ← ProductCard ×3
│ │ ¥29.9│ │ ¥19.9│ │ ¥39.9│  │
│ └──────┘ └──────┘ └──────┘  │
├──────────────────────────────┤
│ 为你推荐              换一批> │
│ ┌──────────┐ ┌──────────┐   │
│ │  商品1   │ │  商品2   │   │ ← ProductCard ×4 (2列)
│ │  ¥59.00  │ │  ¥89.00  │   │
│ └──────────┘ └──────────┘   │
│ ┌──────────┐ ┌──────────┐   │
│ │  商品3   │ │  商品4   │   │
│ │  ¥79.00  │ │  ¥49.00  │   │
│ └──────────┘ └──────────┘   │
├──────────────────────────────┤
│ 热销排行榜                    │
│ ┌──────────┐ ┌──────────┐   │
│ │  热销1   │ │  热销2   │   │ ← ProductCard ×4 (2列)
│ └──────────┘ └──────────┘   │
│ ┌──────────┐ ┌──────────┐   │
│ │  热销3   │ │  热销4   │   │
│ └──────────┘ └──────────┘   │
│                              │
├──────────────────────────────┤
│  🏠首页  📂分类  🛒购物车  👤我的 │ ← BottomNav (fixed)
└──────────────────────────────┘
```

### 5.4 交互行为

| 元素 | 事件 | 行为 |
|------|------|------|
| 搜索栏 | tap | `navigate` — 跳转搜索页 |
| Banner 轮播 | tap (每张) | `navigate` — 跳转对应活动页 |
| 分类图标 | tap (每个) | `navigate` — 跳转分类列表页 |
| 秒杀商品 | tap (每个) | `navigate` — 跳转商品详情页 |
| 推荐商品 | tap (每个) | `navigate` — 跳转商品详情页 |
| 热销商品 | tap (每个) | `navigate` — 跳转商品详情页 |
| 查看更多 | tap | `navigate` — 跳转对应列表页 |
| 底部导航 | tap (每个) | `navigate` — 切换 Tab 页面 |

---

## 6. 实施计划

### Phase 1：组件定义（修改 component-registry 和 schema）

| 步骤 | 文件 | 内容 |
|------|------|------|
| 1.1 | `packages/component-registry/src/index.ts` | 修改 Input：新增 `inputType` 属性 |
| 1.2 | `packages/component-registry/src/index.ts` | 新增 SearchBar 定义 |
| 1.3 | `packages/component-registry/src/index.ts` | 新增 ProductCard 定义 |
| 1.4 | `packages/component-registry/src/index.ts` | 新增 Countdown 定义 |
| 1.5 | `packages/component-registry/src/index.ts` | 重新设计 BottomNav（移除 deprecated，修改属性） |
| 1.6 | `packages/schema/src/index.ts` | `componentTypes` 数组新增 `'SearchBar'`, `'ProductCard'`, `'Countdown'` |
| 1.7 | `packages/schema/src/index.ts` | `leaves` 集合新增 `'SearchBar'`, `'ProductCard'`, `'Countdown'` |

### Phase 2：运行时渲染（runtime-renderer）

| 步骤 | 文件 | 内容 |
|------|------|------|
| 2.1 | `packages/runtime-renderer/src/index.tsx` | 更新 Input 渲染：支持 `inputType` 属性 |
| 2.2 | `packages/runtime-renderer/src/index.tsx` | 新增 SearchBar 渲染逻辑 |
| 2.3 | `packages/runtime-renderer/src/index.tsx` | 新增 ProductCard 渲染逻辑 |
| 2.4 | `packages/runtime-renderer/src/index.tsx` | 新增 Countdown 渲染逻辑（含计时器） |
| 2.5 | `packages/runtime-renderer/src/index.tsx` | 更新 BottomNav 渲染逻辑（JSON items + 新格式） |

### Phase 3：Studio 适配（studio）

| 步骤 | 文件 | 内容 |
|------|------|------|
| 3.1 | `apps/studio/src/App.tsx` | 验证 WebNode 正确渲染新组件（属性面板自动适配） |
| 3.2 | `apps/studio/src/App.tsx` | 组件面板自动展示新组件（Palette 基于 registry） |
| 3.3 | `apps/studio/src/App.tsx` | 验证 NodeTree 正确展示新组件类型 |

### Phase 4：页面数据创建

| 步骤 | 内容 |
|------|------|
| 4.1 | 在 Studio 中通过拖拽创建登录页组件树 |
| 4.2 | 在 Studio 中通过拖拽创建电商首页组件树 |
| 4.3 | 导出为项目 JSON 文件，作为内置模板 |

### Phase 5：向后兼容

| 步骤 | 内容 |
|------|------|
| 5.1 | 为 BottomNav 旧格式（`items: "a,b,c"`）编写迁移逻辑 |
| 5.2 | 为 Input 无 `inputType` 的旧数据提供默认值 `text` |

---

## 7. 组件约束汇总

| 约束 | 来源 | 说明 |
|------|------|------|
| 最大嵌套深度 12 | schema/validateProject | 所有页面均满足 |
| Page 必须是根节点 | schema/validateProject | 所有页面均满足 |
| Form 不能嵌套 | schema/validateProject | 登录页仅一个 Form |
| Swiper 仅接受 Section/Image | schema/validateProject | 首页 Swiper 直接使用 Image |
| 容器组件才能有 children | schema/validateProject | 所有 leaf 组件无 children |
| 不支持跨页面引用 | studio 当前架构 | 未实现路由系统前，页面间独立 |

---

## 8. 后续扩展建议

### 8.1 可选新组件

| 组件 | 说明 | 优先级 |
|------|------|--------|
| CategoryItem | 封装分类图标+文字的组合，简化分类网格构建 | P2 |
| Price | 格式化价格展示（¥ 符号 + 小数位 + 删除线） | P2 |
| Rating | 星级评分展示 | P3 |
| Avatar | 用户头像 | P3 |
| NoticeBar | 公告/通知横幅 | P3 |

### 8.2 可选功能增强

| 功能 | 说明 |
|------|------|
| BottomNav 图标支持 | items 从字符串数组升级为 `[{label, icon}]` 对象数组 |
| ProductCard 横向变体 | 新增 `layout: 'vertical' | 'horizontal'` 属性 |
| SearchBar 历史记录 | 搜索栏支持搜索历史展示 |
| 页面路由系统 | 实现页面间跳转，使 BottomNav 和 Text 的 navigate 真正生效 |