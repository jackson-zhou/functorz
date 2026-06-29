# 小程序可视化搭建器：AI 分阶段编码计划

> 用途：将项目拆分为多个边界清晰、可独立验收的 AI 编码对话。  
> 执行原则：一次对话只完成一个阶段；验收通过后再开始下一阶段。

## 1. 项目目标

实现一套面向非技术人员的小程序可视化搭建器：

1. 在 Web 编辑器中通过拖拽组合页面。
2. 修改文字、图片、颜色、间距和简单跳转行为。
3. 使用同一份页面 Schema 进行 H5 即时预览和 Taro 小程序渲染。
4. 导出可独立维护的 Taro + React 项目。
5. 在服务器上通过 `miniprogram-ci` 一键生成微信预览二维码。
6. 为后续增加组件、模板、平台和多人协作保留扩展点。

### V1 范围

- 微信小程序一个目标平台。
- 首页、详情页、表单页三个示例页面。
- 约 12 个基础组件。
- 单用户编辑流程，支持项目保存和版本快照。
- H5 即时预览、微信扫码预览、项目 ZIP 导出。
- 基础登录、项目管理、构建任务和部署文档。

### V1 不做

- 任意像素坐标布局。
- 用户输入任意 JavaScript。
- 实时多人协同编辑。
- 支付、订单等具体业务后端。
- 微信自动提交审核和自动正式发布。
- 同时适配多个小程序平台。

## 2. 固定技术方案

除非阶段验收证明方案不可行，否则不要在编码过程中频繁更换技术栈。

| 领域         | 选择                                                     |
| ------------ | -------------------------------------------------------- |
| Monorepo     | pnpm workspace                                           |
| Web 编辑器   | React + TypeScript + Vite                                |
| 拖拽         | dnd-kit                                                  |
| 编辑状态     | Zustand + Immer                                          |
| 协议校验     | Zod                                                      |
| 小程序运行时 | Taro + React                                             |
| 本地草稿     | SurrealDB WASM，IndexedDB 持久化，封装在 Repository 后面 |
| 服务端       | Node.js + TypeScript + Fastify                           |
| 正式数据库   | PostgreSQL + Drizzle ORM，页面 Schema 使用 JSONB         |
| 构建队列     | Redis + BullMQ                                           |
| 小程序 CI    | miniprogram-ci                                           |
| 文件存储     | 本地文件 Provider；预留 S3/OSS/COS Provider              |
| 单元测试     | Vitest                                                   |
| 端到端测试   | Playwright                                               |
| 部署         | Docker Compose + Nginx                                   |

所有依赖使用启动项目时的稳定版本并写入 lockfile，不使用浮动版本。

## 3. 目标目录结构

```text
apps/
  studio/                 Web 可视化编辑器
  runtime/                Taro React 运行时，构建 H5 和微信小程序
  api/                    项目、版本、资源和构建任务 API
  worker/                 Taro 构建与 miniprogram-ci Worker
packages/
  schema/                 PageSchema、校验、迁移和 fixtures
  component-registry/     组件元数据、属性定义和约束
  runtime-renderer/       Schema -> Taro React 组件
  editor-core/            编辑命令、树操作、历史记录
  generator/              独立 Taro 项目生成器
  shared/                 通用类型、日志和错误模型
templates/
  taro-project/            导出项目模板
docs/
  AI_IMPLEMENTATION_PLAN.md
  ARCHITECTURE.md
  PROGRESS.md
  adr/
infra/
  docker-compose.yml
  nginx/
```

## 4. 跨对话协作协议

每次新对话都先发送下面这段提示词，再附加对应阶段任务：

```text
请先读取仓库中的 AGENTS.md、docs/AI_IMPLEMENTATION_PLAN.md、
docs/ARCHITECTURE.md 和 docs/PROGRESS.md，并检查 git status。

本次只实现指定阶段，不提前实现后续阶段，不做无关重构。
先检查已有实现和测试，再开始修改。保持向后兼容，新增依赖需要说明理由。

完成后必须：
1. 运行本阶段要求的测试和构建；
2. 修复本阶段引入的失败；
3. 更新 docs/PROGRESS.md；
4. 列出修改文件、验证命令、遗留风险；
5. 停止，不继续下一阶段。
```

### `docs/PROGRESS.md` 记录格式

```markdown
## 当前状态

- 当前完成阶段：Phase N
- 下一阶段：Phase N+1
- 最后验证时间：YYYY-MM-DD

## 已完成

- ...

## 验证结果

- `pnpm test`: PASS
- `pnpm build`: PASS

## 已知问题

- ...

## 重要决策

- ...
```

## 5. 分阶段编码计划

---

## Phase 0：仓库骨架与工程基线

### 目标

建立可持续迭代的 Monorepo，但不实现业务功能。

### 实现内容

- 创建 pnpm workspace 和目标目录。
- 创建 `studio`、`runtime`、`api`、`worker` 最小应用。
- 配置 TypeScript、ESLint、Prettier、Vitest。
- 配置统一的 `dev`、`build`、`test`、`typecheck` 脚本。
- 固定 Node 和 pnpm 版本。
- 创建 `ARCHITECTURE.md`、`PROGRESS.md` 和第一份 ADR。
- 创建基础 CI，执行安装、类型检查、测试和构建。

### 验收标准

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm --filter studio dev
pnpm --filter runtime dev:h5
```

### 本阶段提示词

```text
执行 Phase 0：建立 pnpm Monorepo、四个最小应用、共享工程配置、基础 CI
和架构文档。不要实现页面 Schema、拖拽、数据库或微信 CI。
保证 install、typecheck、test、build 均可执行，并更新 PROGRESS.md。
```

---

## Phase 1：页面 Schema 与组件协议

### 目标

先稳定系统的核心数据协议，后续编辑器、预览器和生成器都依赖它。

### 实现内容

- 定义 `ProjectSchema`、`PageSchema`、`ComponentNode`、`ThemeSchema`。
- 定义声明式 `ActionSchema`，只支持页面跳转、返回、提交表单等白名单动作。
- 每个节点使用稳定 UUID。
- 增加 Schema `version` 和 migration 接口。
- 使用 Zod 做运行时校验。
- 定义组件注册协议：默认属性、可接受子节点、属性面板元数据和平台能力。
- 定义第一批组件：Page、Section、Flex、Grid、Text、Image、Button、Card、Divider、Spacer、Swiper、Form/Input。
- 提供首页、详情页、表单页 fixtures。
- 测试非法节点、重复 ID、非法嵌套和未知组件。

### 验收标准

- Schema 可以序列化和反序列化。
- 三个 fixture 全部通过校验。
- 非法 Schema 返回可定位到字段路径的错误。
- `schema` 和 `component-registry` 不依赖 React、Taro 或浏览器 API。

### 本阶段提示词

```text
执行 Phase 1：实现纯 TypeScript 的页面 Schema、Zod 校验、组件注册协议、
版本迁移接口和三个页面 fixtures。补充完整单元测试。
不要实现 React 渲染器、拖拽 UI 或数据库。
```

---

## Phase 2：Taro 运行时渲染器

### 目标

证明一份 Schema 可以同时构建为 H5 和微信小程序。

### 实现内容

- 实现递归 `SchemaRenderer`。
- 为第一批组件实现 Taro React 组件。
- 使用样式白名单，不直接透传任意 CSS。
- 实现未知组件、属性错误和渲染异常的降级组件。
- 实现简单页面跳转和表单动作。
- 将 Phase 1 的三个 fixtures 接入 Taro runtime。
- 添加组件渲染测试和基础快照测试。

### 验收标准

```bash
pnpm --filter runtime dev:h5
pnpm --filter runtime build:h5
pnpm --filter runtime build:weapp
pnpm --filter runtime-renderer test
```

- H5 能打开三个示例页面。
- 微信小程序产物成功生成。
- 未知组件不会导致整个页面崩溃。

### 本阶段提示词

```text
执行 Phase 2：根据现有 Schema 实现 Taro React 递归渲染器和首批组件，
接入三个 fixtures，并验证 H5 与 weapp 构建。
不要实现编辑器、持久化或生成器。
```

---

## Phase 3：编辑器外壳与编辑状态

### 目标

先形成完整编辑器界面和可靠状态模型，暂不加入拖拽。

### 实现内容

- 实现左侧组件面板、中间手机画布、右侧属性面板和顶部工具栏。
- 实现页面列表和当前页面切换。
- 画布先直接使用 SchemaRenderer 或 Web 适配层。
- 使用 Zustand + Immer 管理项目、页面、选择节点和 UI 状态。
- 将所有编辑操作定义为明确 command。
- 实现选中节点、查看节点树、只读展示属性。
- 添加编辑状态 selector 和 command 单元测试。

### 验收标准

- 编辑器能加载三个 fixtures。
- 页面切换、节点选中、组件树联动正常。
- 状态更新不直接修改原对象。
- 刷新页面前无需持久化。

### 本阶段提示词

```text
执行 Phase 3：完成编辑器三栏布局、页面列表、手机画布、节点选择和
Zustand/Immer 编辑状态。只实现界面外壳和 command 基础，不加入拖拽、
属性修改、数据库或后端。
```

---

## Phase 4：拖拽、树操作与撤销重做

### 目标

跑通页面搭建最核心的交互闭环。

### 实现内容

- 从组件面板拖入画布。
- 同容器排序、跨容器移动和容器嵌套。
- 删除、复制、上移、下移。
- 使用 command history 实现 undo/redo。
- 拖拽完成后重新执行 Schema 校验。
- 阻止把节点拖入自身后代、非法容器和超过最大深度的位置。
- 保持稳定节点 ID，复制节点时生成新 ID。
- 添加树操作属性测试和关键交互测试。

### 验收标准

- 可以仅通过拖拽搭出一个简单首页。
- 连续撤销和重做结果一致。
- 非法嵌套不会污染项目 Schema。
- 100 次随机树操作后 Schema 仍然合法。

### 本阶段提示词

```text
执行 Phase 4：使用 dnd-kit 实现组件拖入、排序、跨容器移动、删除、复制、
撤销和重做。所有操作必须通过 editor-core command 完成，并补充树结构和
非法嵌套测试。不要实现持久化、后端或微信预览。
```

---

## Phase 5：属性面板、主题和 Demo 页面

### 目标

让非技术用户能够完成实际页面内容和视觉调整。

### 实现内容

- 属性面板由组件注册元数据自动生成。
- 支持文字、图片地址、颜色、字号、圆角、间距和布局参数。
- 使用设计 Token，避免暴露完整 CSS。
- 配置声明式点击动作。
- 实现表单字段编辑。
- 完成统一风格的首页、详情页和表单页。
- 实现导入/导出 Schema JSON。
- 属性修改加入 undo/redo。

### 验收标准

- 不修改代码即可完成三个 Demo 页的内容替换。
- 错误属性不能写入 Schema。
- 导出再导入后的 Schema 语义一致。
- 三个页面均能通过 H5 和 weapp 构建。

### 本阶段提示词

```text
执行 Phase 5：根据组件 Registry 自动生成属性面板，支持受控样式、主题、
声明式动作和表单字段；完成三个正式 Demo 页面及 Schema 导入导出。
不要实现本地数据库、后端和微信 CI。
```

---

## Phase 6：SurrealDB WASM 本地草稿

### 目标

实现刷新恢复、自动保存和离线草稿，同时避免编辑器直接依赖数据库实现。

### 实现内容

- 定义 `LocalProjectRepository` 接口。
- 使用 SurrealDB WASM + IndexedDB 实现浏览器持久化。
- 将数据库运行在 Web Worker 中，避免阻塞编辑 UI。
- 实现项目列表、创建、读取、更新、删除。
- 实现防抖自动保存和保存状态提示。
- 实现最近一次有效快照恢复。
- 测试使用内存 Repository，不强制测试环境加载 WASM。
- 对数据库打开失败提供明确降级和错误提示。

### 验收标准

- 页面刷新后项目和当前页面可以恢复。
- 快速连续修改不会产生过量写入。
- 非法数据不会覆盖最后一次有效快照。
- 数据库实现可以替换，不进入 editor-core。

### 本阶段提示词

```text
执行 Phase 6：通过 Repository 抽象接入 SurrealDB WASM，使用 IndexedDB
保存本地项目和快照，并放入 Web Worker。实现自动保存、恢复和失败降级。
不要实现服务端同步或微信 CI。
```

---

## Phase 7：H5 即时预览

### 目标

编辑器修改后，在独立 iframe 中快速看到真实 Taro H5 效果。

### 实现内容

- Runtime H5 提供 preview 模式。
- 编辑器通过 `postMessage` 发送完整 Schema 或带版本的更新消息。
- 定义消息协议、协议版本、request ID 和错误响应。
- 校验 `origin` 和消息结构。
- 使用 100～300ms 防抖更新。
- 支持常见手机尺寸切换和重新加载。
- iframe 内渲染失败时显示错误覆盖层，不影响编辑器。

### 验收标准

- 修改文字或颜色后，预览在 300ms 左右更新。
- 非法消息被拒绝。
- iframe 崩溃或刷新不丢失编辑器数据。
- H5 预览使用与小程序相同的 runtime-renderer。

### 本阶段提示词

```text
执行 Phase 7：实现独立 Taro H5 iframe 即时预览和带版本的 postMessage
协议，包含 origin 校验、Schema 校验、防抖和错误覆盖层。
不要实现项目生成、后端和微信 CI。
```

---

## Phase 8：独立 Taro 项目生成器

### 目标

从 Schema 生成可以离开编辑器独立安装、构建和二次开发的项目。

### 实现内容

- 建立版本化 Taro 项目模板。
- 实现确定性的 `generateProject(schema)`。
- 生成页面路由、Schema 文件、主题和组件引用。
- 生成 `project.config.json`、README 和运行命令。
- 输出 ZIP。
- 防止路径穿越、非法文件名和模板注入。
- 对生成文件做快照测试。
- 在临时目录中安装或使用 workspace 依赖执行真实构建验证。

### 验收标准

- 同一 Schema 多次生成结果一致，时间戳文件除外。
- 导出 ZIP 解压后可以构建 H5 和 weapp。
- 导出项目不依赖 Studio 源码目录。
- 非法路由和文件名被拒绝。

### 本阶段提示词

```text
执行 Phase 8：实现版本化 Taro 项目模板、确定性生成器和 ZIP 导出，
并用真实 H5/weapp 构建作为集成测试。重点处理路径安全和模板版本。
不要实现 API、云端项目或 miniprogram-ci。
```

---

## Phase 9：项目 API、PostgreSQL 和资源上传

### 目标

提供云端权威数据源，使项目可以跨浏览器保存并为构建任务提供输入。

### 实现内容

- Fastify API 和统一错误模型。
- PostgreSQL + Drizzle migration。
- 用户、项目、页面快照、构建任务和资源表。
- 项目 CRUD、乐观锁和版本快照。
- 简单登录和项目所有权校验。
- 图片上传 Provider：本地文件实现，保留 S3 接口。
- 文件类型、大小、文件名和访问权限校验。
- Studio 在登录后同步云端，SurrealDB WASM 继续作为本地草稿缓存。
- 明确冲突策略：V1 使用版本号冲突提示，不做自动合并。

### 验收标准

```bash
docker compose up -d postgres
pnpm --filter api db:migrate
pnpm --filter api test
```

- 两个浏览器可以登录并读取同一账号下的项目。
- 并发更新不会静默覆盖新版本。
- 用户不能读取其他用户项目。
- 上传接口拒绝非法文件和超限文件。

### 本阶段提示词

```text
执行 Phase 9：实现 Fastify 项目 API、PostgreSQL/Drizzle 数据模型、
项目版本、基础认证和资源上传 Provider；接入 Studio 云端保存。
SurrealDB WASM 继续作为本地草稿，不实现自动冲突合并。
不要实现构建 Worker 和微信 CI。
```

---

## Phase 10：构建 Worker 与微信一键预览

### 目标

实现“点击生成预览 → 后台构建 → 返回微信二维码”的完整闭环。

### 实现内容

- Redis + BullMQ 构建队列。
- API 创建任务，Worker 独立消费。
- 任务状态：queued、generating、building、uploading、success、failed、cancelled。
- 调用 Phase 8 生成器创建独立项目。
- 执行 Taro weapp 构建。
- 调用 `miniprogram-ci.preview`，二维码使用 base64 或受控文件返回。
- 支持版本号、备注、指定启动页面和 query。
- 增加构建超时、取消、有限重试和临时目录清理。
- 使用独立低权限进程或容器执行构建。
- CI 私钥只从 Secret/环境变量读取，绝不进入前端、数据库、日志或 Git。
- 实现 `MockWeChatCiProvider`，无真实凭证时可完整测试流程。

### 需求方资源

- 微信小程序 AppID。
- 管理员下载的代码上传密钥。
- 构建服务器固定公网 IP 已加入上传白名单。
- 必要的开发者和体验者权限。

### 验收标准

- 无微信密钥时，Mock Provider 可以跑通完整任务状态。
- 有真实密钥时，点击一次可以返回可扫描预览二维码。
- API 重启不会丢失任务记录。
- 失败任务能看到脱敏日志和明确错误阶段。
- 临时目录和二维码按生命周期自动清理。

### 本阶段提示词

```text
执行 Phase 10：实现 BullMQ 构建任务、独立 Worker、Taro weapp 构建和
miniprogram-ci.preview。先完成 Mock Provider 自动测试，再通过环境变量
接入真实 AppID 与代码上传私钥。实现超时、取消、重试、日志脱敏和清理。
不要尝试自动提交微信审核或正式发布。
```

---

## Phase 11：交付加固与部署

### 目标

将“能运行”提升到“可交付、可排障、可回滚”。

### 实现内容

- Studio 核心操作 Playwright E2E。
- 从创建项目到 Mock 微信二维码的全链路测试。
- API 限流、请求大小限制和安全响应头。
- 构建并发、磁盘配额、超时和清理审计。
- 结构化日志、request ID、job ID 和健康检查。
- Dockerfile、Docker Compose、Nginx 配置。
- PostgreSQL 和资源目录备份恢复说明。
- 首次部署、升级、回滚和密钥轮换文档。
- 最终检查依赖许可证、未使用代码和敏感信息。

### 验收标准

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
docker compose up --build
```

- 新服务器可以仅按文档完成部署。
- 不配置域名时，可以通过固定公网 IP 访问编辑器。
- 配置 HTTPS 后可以切换到域名访问。
- 不存在提交到 Git 的私钥、密码和真实 token。
- 服务重启后项目数据可恢复，失败任务可排查。

### 本阶段提示词

```text
执行 Phase 11：完成 E2E、安全和可靠性加固、Docker Compose/Nginx 部署、
监控健康检查、备份恢复、升级回滚和最终交付文档。
运行全量验证并修复问题，不新增 V1 范围之外的产品功能。
```

## 6. 全局完成标准

项目只有同时满足以下条件，才算 V1 完成：

1. 业务人员可以拖拽搭建并修改三个 Demo 页面。
2. Schema 是编辑器、H5 和小程序的唯一页面数据来源。
3. H5 即时预览和 weapp 构建均通过。
4. 刷新浏览器可以恢复本地草稿。
5. 登录后可以将项目保存到服务器并保留版本。
6. 可以导出独立 Taro 项目 ZIP。
7. 可以通过服务器一键生成微信预览二维码。
8. 构建失败有明确错误阶段，敏感信息不进入日志。
9. 全量测试、类型检查和构建通过。
10. 新服务器可以按照交付文档完成部署和回滚。

## 7. 推荐提交节奏

每个 Phase 验收通过后单独提交，避免多个阶段混在同一个变更中：

```text
phase-0/bootstrap
phase-1/schema
phase-2/runtime-renderer
phase-3/editor-shell
phase-4/drag-drop
phase-5/property-panel
phase-6/local-persistence
phase-7/h5-preview
phase-8/generator
phase-9/project-api
phase-10/wechat-ci
phase-11/delivery-hardening
```

真实微信密钥仅在 Phase 10 的自动测试通过后接入；正式服务器资源在 Phase 9
之前准备即可，前八个阶段都可以在本地开发环境中完成。
