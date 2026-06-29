import { Worker } from 'bullmq'
import {
  BuildWorker,
  MiniprogramCiProvider,
  MockWeChatCiProvider,
  type BuildRequest,
} from './build-worker.js'
const parsed = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379')
const provider =
  process.env.WECHAT_APP_ID && process.env.WECHAT_PRIVATE_KEY_PATH
    ? new MiniprogramCiProvider(process.env.WECHAT_APP_ID, process.env.WECHAT_PRIVATE_KEY_PATH)
    : new MockWeChatCiProvider()
const builder = new BuildWorker(provider, Number(process.env.BUILD_TIMEOUT_MS ?? 600000))
const worker = new Worker(
  'functorz-builds',
  async (job) => {
    const request = job.data as BuildRequest
    const result = await builder.process(request)
    for (const stage of result.stages) await job.updateProgress(stage)
    if (result.status === 'failed') throw new Error(result.error?.message ?? 'Build failed')
    return result
  },
  {
    connection: {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      password: parsed.password || undefined,
      maxRetriesPerRequest: null,
    },
    concurrency: Number(process.env.BUILD_CONCURRENCY ?? 2),
    limiter: { max: 2, duration: 1000 },
  },
)
worker.on('failed', (job, error) =>
  console.error(
    JSON.stringify({
      level: 'error',
      jobId: job?.id,
      message: error.message.replace(
        /(token|secret|password|private[_ -]?key)=\S+/gi,
        '$1=[REDACTED]',
      ),
    }),
  ),
)
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.on(signal, () => void worker.close().then(() => process.exit(0)))
