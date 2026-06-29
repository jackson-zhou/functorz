# ADR 0001：工程基线

- 状态：Accepted
- 日期：2026-06-27

## 决策

使用 pnpm workspace 管理 `studio`、`runtime`、`api` 和 `worker`。Node 固定为
24.14.0。Taro 及其 CLI 固定为 4.2.0，React 固定为 18.3.1。

Web 编辑器使用 Vite；Taro runtime 使用官方 Webpack 5 编译链。服务端和 Worker
使用 Node ESM 与 TypeScript。

## 原因

- Taro 4.2.0 的 React peer dependency 是 `^18`。
- Taro CLI 和项目依赖版本一致可以减少构建差异。
- 四个应用保持独立构建入口，为后续拆分部署保留边界。

## 后果

- Studio 暂不使用 React 19，避免两套 React 类型和运行行为。
- Taro runtime 与 Studio 使用不同构建器，但共享根级质量脚本。
