# 淘宝首页组件使用指南

## 概述

本项目实现了淘宝首页风格的电商页面组件，可用于快速构建移动端电商首页。

## 组件列表

### 1. DataProvider - 数据容器
**作用**：统一发起多个 API 请求，并通过 Context 将数据传递给子组件。

**属性配置**：
- `apis`: JSON 数组，配置多个 API 端点
- `dataKey`: 数据注入到 context 的键名（默认 `homeData`）

**API 配置格式**：
```json
[
  {
    "key": "kingkong",
    "url": "https://api.example.com/home/kingkong",
    "method": "GET"
  },
  {
    "key": "activities",
    "url": "https://api.example.com/home/activities",
    "method": "GET"
  },
  {
    "key": "products",
    "url": "https://api.example.com/home/products",
    "method": "GET"
  }
]
```

---

### 2. KingKongList - 金刚位
**作用**：展示图标 + 文字的网格入口，通常用于首页快捷入口。

**属性配置**：
- `dataSource`: 数据绑定表达式，如 `${homeData.kingkong.list}`
- `columns`: 列数（默认 5）
- `iconSize`: 图标尺寸，单位 px（默认 44）

**数据格式**：
```typescript
interface KingKongItem {
  icon: string;      // 图标 URL
  text: string;      // 文字标签
  url?: string;      // 跳转链接（可选）
  badge?: string;    // 右上角角标（可选）
}
```

---

### 3. ActivityRow - 活动横滑
**作用**：横向滚动的活动入口卡片，如淘宝直播、百亿补贴等。

**属性配置**：
- `dataSource`: 数据绑定表达式，如 `${homeData.activities.list}`

**数据格式**：
```typescript
interface ActivityItem {
  image: string;      // 图片 URL
  title: string;      // 标题
  subtitle?: string;  // 副标题（可选）
  price?: string;     // 价格（可选）
  badge?: string;     // 角标文字（可选）
  url?: string;       // 跳转链接（可选）
}
```

---

### 4. CouponBanner - 优惠券横幅
**作用**：展示优惠券领取横幅。

**属性配置**：
- `title`: 标题（默认 "超级立减"）
- `desc`: 描述文字
- `amount`: 金额显示，如 "¥80"
- `buttonText`: 按钮文字（默认 "立即领取"）

---

### 5. ProductGrid - 商品网格
**作用**：2 列瀑布流展示商品卡片。

**属性配置**：
- `dataSource`: 数据绑定表达式，如 `${homeData.products.list}`
- `columns`: 列数（默认 2）
- `gap`: 卡片间距（默认 "12px"）

**数据格式**：
```typescript
interface ProductItem {
  image: string;        // 商品图片 URL
  name: string;         // 商品名称
  price: string;        // 售价
  originalPrice?: string;  // 原价（划线价，可选）
  tag?: string;         // 标签文字（可选）
  sales?: string;       // 已售数量（可选）
  url?: string;         // 跳转链接（可选）
}
```

---

## 完整页面结构

```
Page
└── DataProvider
    ├── SearchBar (搜索栏)
    ├── KingKongList (金刚位入口)
    ├── ActivityRow (活动横滑)
    ├── CouponBanner (优惠券横幅)
    ├── ProductGrid (商品网格流)
    └── BottomNav (底部导航)
```

---

## 示例配置

完整的首页 JSON 配置示例：`examples/taobao-home.json`

## 使用说明

1. 在可视化编辑器中拖拽 DataProvider 组件作为最外层容器
2. 配置 DataProvider 的 `apis` 属性，设置需要请求的接口
3. 在 DataProvider 内部依次拖拽其他组件
4. 配置各组件的 `dataSource` 属性，绑定对应的数据路径
5. 预览效果并调整样式

## 特性

- ✅ 数据驱动：所有列表数据从 API 动态获取
- ✅ 占位符：API 数据返回前显示占位符骨架
- ✅ 错误处理：请求失败显示错误信息和重试按钮
- ✅ 高度可配置：通过属性面板配置所有显示内容
- ✅ 响应式：适配不同屏幕尺寸
