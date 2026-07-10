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

### 代码规范

- **先理解再动手**：修改或新增代码前，必须先阅读相关文件，理解项目的语言（React + TypeScript）、组件风格（自定义 CSS，无第三方 UI 库）、状态管理（zustand）、事件绑定模式（React JSX camelCase: `onClick`, `onChange` 等），确保新代码与现有风格一致。
- **组件复用优先**：在页面上添加组件时，必须优先使用 `apps/studio/src/components/` 目录下已有的组件。如果没有现成可用组件，必须先询问用户是否创建新组件，经确认后再继续。禁止在未确认的情况下自行新建组件，避免出现无法复现的页面。
- **事件绑定复用**：交互绑定事件时同样遵循上述规则，优先参考已有的事件绑定模式和写法，保持一致性。

### 修改代码后自动部署到 111.207.40.188

Studio 是静态前端（Vite 构建产物），不需要构建 Docker 镜像。轻量部署流程：

1. **本地构建**：
   ```bash
   pnpm --filter studio build
   ```

2. **rsync 到服务器**：
   ```bash
   rsync -avz --delete apps/studio/dist/ zhoujs@111.207.40.188:~/studio-dist/
   ```

3. **docker cp 到容器**（无需重启）：
   ```bash
   ssh zhoujs@111.207.40.188 "sudo docker cp ~/studio-dist/. infra-studio-1:/usr/share/nginx/html/"
   ```

4. **验证**：访问 http://111.207.40.188:1000 确认修改生效。
