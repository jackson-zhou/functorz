# 部署与运维

## 首次部署

1. 安装 Docker Engine 与 Compose，复制 `infra/.env.example` 为 `infra/.env`，生成独立 PostgreSQL 密码。
2. 微信预览需要把构建机固定公网 IP 加入微信白名单，将上传私钥以只读文件挂载到 Worker，并设置 `WECHAT_APP_ID`、`WECHAT_PRIVATE_KEY_PATH`。私钥不得写入镜像、数据库或日志。
3. 执行 `docker compose --env-file infra/.env -f infra/docker-compose.yml up -d --build`，检查 `/api/health`。
   API 容器启动时会先执行幂等 migration；Studio 的 `/runtime/` 路径由独立 Taro H5 容器提供即时预览。
4. 生产环境在 Nginx 外层终止 TLS，或替换配置加入证书；仅 IP 部署可直接使用 `HTTP_PORT`。

## 升级与回滚

升级前执行备份并记录当前镜像 digest。拉取目标版本后先运行 migration，再滚动重建 API、Worker、Studio。出现错误时恢复旧镜像；migration 必须提供向前兼容窗口，禁止与旧版本不兼容的同批删列。

## 备份与恢复

- PostgreSQL：每日 `pg_dump --format=custom`，加密后异地保存；每月演练 `pg_restore`。
- 资源：每日增量备份 `assets` volume，并和数据库快照使用同一批次编号。
- Redis 只承载可恢复队列；构建任务权威状态在 PostgreSQL。恢复后重新投递 `queued` 和超时的 `building` 任务。

恢复顺序：PostgreSQL → assets → API → Redis/Worker → Studio。恢复完成后校验项目数量、最新版本、资源抽样哈希和 Mock 构建。

## 容量与告警

监控 API P95/P99、5xx、版本冲突率、队列深度、任务各阶段耗时、Worker RSS、临时目录与 assets 磁盘占用。磁盘 70% 告警、85% 停止接收新构建；构建默认 10 分钟超时并始终清理临时目录。

健康检查至少覆盖 `/api/health`、PostgreSQL `pg_isready`、Redis `PING` 和 BullMQ waiting/failed 深度。API 默认每 IP 每分钟 120 请求、请求体 6 MiB、上传文件 5 MiB；按入口流量调整时保持 Nginx 与应用限制一致。

## 故障排查与回滚检查

- 使用 `x-request-id`、构建 `jobId` 串联 Nginx、API 和 Worker JSON 日志；日志不得打印 token、Schema 或微信私钥。
- 构建失败先按 `generating/building/uploading` 阶段定位，再检查 Worker 临时盘、Redis 连接和微信 IP 白名单。
- 回滚后依次验证登录、项目读取、乐观锁冲突、图片上传、H5 预览和 Mock 二维码；数据库 migration 必须向前兼容旧镜像。

## 密钥轮换

创建新密钥并加入微信白名单，灰度一个 Worker 验证预览，随后替换其余 Worker，最后吊销旧密钥。日志只记录 job ID、阶段和脱敏错误，不记录 Schema、token 或私钥内容。
