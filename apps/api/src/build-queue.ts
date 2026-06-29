import { Queue } from 'bullmq'
import type { BuildJob, BuildService, BuildStatus } from './builds.js'
const connection = (url: string) => {
  const parsed = new URL(url)
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password || undefined,
    maxRetriesPerRequest: null as null,
  }
}
export class BullBuildService implements BuildService {
  private queue: Queue
  constructor(redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379') {
    this.queue = new Queue('functorz-builds', {
      connection: connection(redisUrl),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 604800 },
      },
    })
  }
  async create(id: string, projectId: string, ownerId: string, project?: unknown) {
    await this.queue.add(
      'preview',
      {
        id,
        projectId,
        ownerId,
        project,
        options: { version: '1.0.0', description: 'Functorz preview' },
      },
      { jobId: id },
    )
    return {
      id,
      projectId,
      ownerId,
      status: 'queued' as const,
      createdAt: new Date().toISOString(),
    }
  }
  async get(id: string): Promise<BuildJob | undefined> {
    const job = await this.queue.getJob(id)
    if (!job) return
    const state = await job.getState()
    const status = (
      state === 'completed'
        ? 'success'
        : state === 'failed'
          ? 'failed'
          : state === 'active'
            ? job.progress || 'generating'
            : 'queued'
    ) as BuildStatus
    const result = job.returnvalue as Partial<BuildJob> | undefined
    return {
      id,
      projectId: job.data.projectId,
      ownerId: job.data.ownerId,
      createdAt: new Date(job.timestamp).toISOString(),
      status,
      ...result,
    }
  }
  async cancel(id: string, ownerId: string) {
    const job = await this.queue.getJob(id)
    if (!job || job.data.ownerId !== ownerId) return
    await job.remove()
    return {
      id,
      projectId: job.data.projectId,
      ownerId,
      status: 'cancelled' as const,
      createdAt: new Date(job.timestamp).toISOString(),
    }
  }
  async close() {
    await this.queue.close()
  }
}
