import { randomUUID } from 'node:crypto'
import Fastify, { type FastifyInstance } from 'fastify'
import multipart from '@fastify/multipart'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { validateProject } from '@functorz/schema'
import { BuildJobStore, type BuildService } from './builds.js'
import { MemoryProjectStore, StoreError, type ProjectStore } from './store.js'
import { LocalAssetProvider, type AssetProvider } from './storage.js'
function homeImage(label: string, color: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" rx="28" fill="${color}"/><rect x="72" y="92" width="256" height="188" rx="24" fill="white" fill-opacity=".82"/><path d="M105 242l65-70 48 46 39-34 43 58z" fill="${color}" fill-opacity=".65"/><circle cx="258" cy="145" r="24" fill="${color}" fill-opacity=".7"/><text x="200" y="332" text-anchor="middle" fill="white" font-size="28" font-family="Arial,sans-serif">${label}</text></svg>`)}`
}
interface Options {
  store?: ProjectStore
  builds?: BuildService
  tokens?: Map<string, string>
  assets?: AssetProvider
}
export function buildApp(options: Options = {}): FastifyInstance {
  const app = Fastify({ logger: true, bodyLimit: 6 * 1024 * 1024, requestIdHeader: 'x-request-id' })
  const store = options.store ?? new MemoryProjectStore()
  const builds = options.builds ?? new BuildJobStore()
  const tokens = options.tokens ?? new Map([['dev-token', '00000000-0000-4000-8000-000000000001']])
  const assets = options.assets ?? new LocalAssetProvider(process.env.ASSET_ROOT ?? './data/assets')
  void app.register(helmet, { contentSecurityPolicy: false })
  void app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 120),
    timeWindow: '1 minute',
  })
  void app.register(multipart, { limits: { files: 1, fileSize: 5 * 1024 * 1024 } })
  const user = (request: { headers: { authorization?: string } }) => {
    const token = request.headers.authorization?.replace(/^Bearer /, '')
    const id = token ? tokens.get(token) : undefined
    if (!id) throw new ApiError('UNAUTHORIZED', 401)
    return id
  }
  app.addHook('onSend', async (_req, reply, payload) => {
    reply
      .header('x-content-type-options', 'nosniff')
      .header('x-frame-options', 'DENY')
      .header('referrer-policy', 'no-referrer')
    return payload
  })
  app.setErrorHandler((error, _request, reply) => {
    const known = error instanceof ApiError || error instanceof StoreError
    reply.status(known ? error.statusCode : 500).send({
      error: {
        code: known ? error.code : 'INTERNAL_ERROR',
        message: known ? error.message : 'Internal server error',
      },
    })
  })
  app.get('/health', async () => ({ service: 'api', status: 'ok' }))
  app.get('/home', async () => ({
    code: 0,
    data: {
      tabs: ['关注', '推荐', '闪购', '国补', '飞猪', '立减'],
      kingKong: [
        { id: 'farm', icon: '树', label: '芭芭农场', color: '#16c875' },
        { id: 'factory', icon: '淘', label: '淘工厂', color: '#ff5035' },
        { id: 'coin', icon: '币', label: '领淘金币', color: '#ffbd22' },
        { id: 'market', icon: '市', label: '天猫超市', color: '#47cc2e' },
        { id: 'coupon', icon: '¥', label: '红包签到', color: '#f13b42' },
      ],
      products: [
        { id: 'sport-1', name: '专业训练乒乓球拍套装', price: '1199', image: homeImage('运动好物', '#59788c'), tag: '天猫 立减10%', sales: '100+' },
        { id: 'digital-1', name: '透明无线蓝牙耳机 超长续航', price: '108', image: homeImage('数码好物', '#668fa2'), tag: '天猫 券后价', sales: '6000+' },
        { id: 'keyboard-1', name: '机械键盘 RGB背光青轴', price: '159', image: homeImage('电脑配件', '#674f84'), tag: '秒杀', sales: '2345' },
        { id: 'power-1', name: '便携充电宝 20000mAh', price: '79', image: homeImage('出行必备', '#b25e42'), tag: '包邮', sales: '4567' },
      ],
    },
  }))
  app.post('/auth/login', async (request) => {
    const body = request.body as { email?: string }
    if (!body.email) throw new ApiError('INVALID_CREDENTIALS', 400)
    return {
      token: 'dev-token',
      user: { id: '00000000-0000-4000-8000-000000000001', email: body.email },
    }
  })
  app.get('/projects', async (request) => store.list(user(request)))
  app.post('/projects', async (request) =>
    store.create(user(request), validateProject(request.body)),
  )
  app.get('/projects/:id', async (request) => {
    const owner = user(request)
    const project = await store.get((request.params as { id: string }).id)
    if (!project || project.ownerId !== owner) throw new ApiError('NOT_FOUND', 404)
    return project
  })
  app.put('/projects/:id', async (request) => {
    const owner = user(request)
    const { id } = request.params as { id: string }
    const body = request.body as { version: number; project: unknown }
    return store.update(owner, id, body.version, validateProject(body.project))
  })
  app.get('/projects/:id/versions', async (request) => {
    const owner = user(request)
    const { id } = request.params as { id: string }
    const project = await store.get(id)
    if (!project || project.ownerId !== owner) throw new ApiError('NOT_FOUND', 404)
    return store.snapshots(id)
  })
  app.post('/assets', async (request) => {
    const owner = user(request)
    const file = await request.file()
    if (!file) throw new ApiError('FILE_REQUIRED', 400)
    try {
      return await assets.put(owner, file.filename, file.mimetype, await file.toBuffer())
    } catch (error) {
      const code = error instanceof Error ? error.message : 'UPLOAD_FAILED'
      const status = code === 'FILE_TOO_LARGE' ? 413 : code === 'UNSUPPORTED_MEDIA_TYPE' ? 415 : 400
      throw new ApiError(code, status)
    }
  })
  app.post('/projects/:id/builds', async (request) => {
    const owner = user(request)
    const { id } = request.params as { id: string }
    const project = await store.get(id)
    if (!project || project.ownerId !== owner) throw new ApiError('NOT_FOUND', 404)
    return builds.create(randomUUID(), id, owner, project.project)
  })
  app.get('/builds/:id', async (request) => {
    const owner = user(request)
    const job = await builds.get((request.params as { id: string }).id)
    if (!job || job.ownerId !== owner) throw new ApiError('NOT_FOUND', 404)
    return job
  })
  app.delete('/builds/:id', async (request) => {
    const owner = user(request)
    const job = await builds.cancel((request.params as { id: string }).id, owner)
    if (!job) throw new ApiError('NOT_FOUND', 404)
    return job
  })
  return app
}
class ApiError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
  ) {
    super(code)
  }
}
