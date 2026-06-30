# AGENTS.md - 工作手册

## 部署信息

- 服务器: zhoujs@111.207.40.188 (CentOS Stream 9, Docker 24 + Compose v2)
- 访问地址: http://111.207.40.188:1000 (云安全组封锁80端口入站，改用1000)
- 环境配置: infra/.env (含 POSTGRES_PASSWORD, HTTP_PORT, WECHAT_APP_ID 等)
- Compose 文件: infra/docker-compose.deploy.yml (生产用，含7个服务)
- 服务列表: postgres, redis, api, worker, studio, runtime, nginx
- 管理命令: `cd ~/functorz && sudo docker compose --env-file infra/.env -f infra/docker-compose.deploy.yml <ps|logs|restart|down|up -d>`
- runtime H5 产物: 本地构建后 rsync 到 infra/runtime-h5-dist/，Dockerfile 仅 COPY 到 nginx
- migration SQL 已修复为 CREATE TABLE IF NOT EXISTS（幂等）
- Docker 镜像加速: docker.m.daocloud.io

## 注意事项

### crypto.randomUUID 兼容性

项目使用 `crypto.randomUUID()` 生成唯一 ID（组件节点、预览请求等），该 API **仅在 HTTPS 安全上下文或 localhost 下可用**。当前生产环境为 HTTP，会导致 Chrome/Edge 等浏览器拖拽组件时报 `crypto.randomUUID is not a function`。

修复方式：在 `packages/editor-core/src/index.ts`、`apps/studio/src/preview-protocol.ts`、`apps/runtime/src/pages/index/index.tsx` 三处添加降级逻辑：优先使用 `crypto.randomUUID()`，不可用时回退到 `Math.random()` 的 UUID v4 实现。

参考：[MDN crypto.randomUUID - Secure context required](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID#browser_compatibility)
