# 架构说明

## 当前基线

项目采用 pnpm Monorepo：

- `apps/studio`：React + Vite Web 编辑器。
- `apps/runtime`：Taro + React 多端运行时。
- `apps/api`：Fastify HTTP API。
- `apps/worker`：独立后台任务进程。

## 计划中的核心边界

- 页面协议位于 `packages/schema`，保持纯 TypeScript。
- 组件元数据位于 `packages/component-registry`。
- 编辑操作位于 `packages/editor-core`，不直接依赖 UI 和数据库。
- Taro 渲染位于 `packages/runtime-renderer`。
- 独立项目生成位于 `packages/generator`。
- Studio、H5 和微信小程序共享同一份 Page Schema。

详细演进计划见 `docs/AI_IMPLEMENTATION_PLAN.md`。
