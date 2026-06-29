# 实现进度

## 当前状态

- 当前完成阶段：Phase 11（V1 代码完成）
- 下一阶段：生产环境联调与容量基线
- 最后验证时间：2026-06-29

## 已完成

- Phase 0–3：Monorepo、Schema/Registry、Taro 递归渲染器、Studio 三栏编辑状态。
- Phase 4：dnd-kit 组件插入、同/跨容器移动、非法操作原子回滚、复制/删除/排序和 undo/redo；100 轮树操作持续通过 Schema 校验。
- Phase 5：Registry 驱动属性面板、受控样式 Token、主题、声明式动作、三个 Demo 和 JSON 导入导出。
- Phase 6：SurrealDB `indxdb` WASM Worker、本地快照、启动恢复、防抖保存，以及 IndexedDB 失败降级。
- Phase 7：Studio 到独立 Taro H5 runtime 的版本化 postMessage、origin/Schema 校验、错误响应、重载和设备尺寸切换。
- Phase 8：确定性独立 Taro 项目与 ZIP，包含自带 renderer、配置和路由；导出产物真实 H5/weapp 构建通过。
- Phase 9：Fastify API、PostgreSQL Store、Drizzle Schema、幂等 migration、乐观锁快照、multipart 图片上传和 Studio 云同步。
- Phase 10：Redis/BullMQ 持久队列、真实 Taro weapp 子进程、超时/重试/取消边界、临时目录清理、Mock 与 miniprogram-ci Provider。
- Phase 11：Helmet/限流/请求限制、结构化日志与脱敏、Playwright、Studio/Runtime/API/Worker/PostgreSQL/Redis/Nginx Compose 和部署运维文档。

## 验证结果

- `pnpm format`：PASS
- `pnpm lint`：PASS
- `pnpm typecheck`：PASS
- `pnpm test`：PASS（40 tests）
- `pnpm build`：PASS（包含 runtime H5/weapp）
- `pnpm --filter @functorz/generator test:integration`：PASS（导出项目 H5/weapp）
- `pnpm test:e2e`：PASS（Playwright）
- `docker compose config`：PASS
- 敏感信息模式扫描：PASS

## 已知问题

- 当前执行机是 Node 23.7.0，低于仓库固定的 Node 24.14.0；所有门禁通过，但交付环境必须使用 `.nvmrc` 版本。
- Taro H5 主入口仍有约 281 KiB 的性能预算 warning；不影响功能，后续可拆分 Zod locale 和运行时依赖。
- Docker Compose 完整启动未执行：本机 Docker daemon 未运行（`Cannot connect to the Docker daemon`）。Compose 静态配置已通过，需在 daemon 可用后执行文档中的启动与恢复演练。
- 真实微信预览依赖外部 AppID、上传私钥和 IP 白名单；无凭证的 Mock 全链路和真实 weapp 构建已通过。

## 重要决策

- 编辑命令始终在副本执行并完整校验，失败命令不进入历史栈。
- SurrealDB、PostgreSQL、资源存储、构建队列和微信 CI 均位于可替换边界后；测试不依赖真实外部凭证。
- Redis/BullMQ 保存可恢复任务，PostgreSQL 保存项目及版本快照；V1 冲突策略为显式 409，不自动合并。
- 构建 Worker 使用预安装、锁定版本的 Taro 依赖，构建目录一次性创建并在所有结果路径清理。
