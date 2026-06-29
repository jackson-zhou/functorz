# 小程序可视化搭建器

基于 Taro + React 的小程序可视化搭建平台，覆盖拖拽编辑、本地/云端保存、
H5 即时预览、独立项目导出和微信预览构建链路。

## 环境要求

- Node.js 24.14.0
- pnpm 10.18.3

```bash
nvm use
pnpm install
```

## 常用命令

```bash
# Web 编辑器
pnpm --filter studio dev

# Taro H5
pnpm --filter runtime dev:h5

# Taro 微信小程序
pnpm --filter runtime dev:weapp

# API / Worker
pnpm --filter api dev
pnpm --filter worker dev

# 全量质量检查
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 应用边界

- `apps/studio`：React + Vite 可视化编辑器。
- `apps/runtime`：Taro + React H5/微信小程序运行时。
- `apps/api`：Fastify API。
- `apps/worker`：后台构建 Worker。

架构和跨对话执行约定见：

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/AI_IMPLEMENTATION_PLAN.md`](docs/AI_IMPLEMENTATION_PLAN.md)
- [`docs/PROGRESS.md`](docs/PROGRESS.md)
