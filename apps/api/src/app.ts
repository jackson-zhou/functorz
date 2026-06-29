import { randomUUID } from 'node:crypto'
import Fastify, { type FastifyInstance } from 'fastify'
import multipart from '@fastify/multipart'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { validateProject } from '@functorz/schema'
import { BuildJobStore, type BuildService } from './builds.js'
import { MemoryProjectStore, StoreError, type ProjectStore } from './store.js'
import { LocalAssetProvider, type AssetProvider } from './storage.js'
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
