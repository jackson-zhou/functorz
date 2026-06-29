export type BuildStatus =
  'queued' | 'generating' | 'building' | 'uploading' | 'success' | 'failed' | 'cancelled'
export interface BuildJob {
  id: string
  projectId: string
  ownerId: string
  status: BuildStatus
  createdAt: string
  error?: { stage: BuildStatus; message: string }
  qrCode?: string
}
export interface BuildService {
  create(id: string, projectId: string, ownerId: string, project?: unknown): Promise<BuildJob>
  get(id: string): Promise<BuildJob | undefined>
  cancel(id: string, ownerId: string): Promise<BuildJob | undefined>
  close?(): Promise<void>
}
export class BuildJobStore implements BuildService {
  jobs = new Map<string, BuildJob>()
  async create(id: string, projectId: string, ownerId: string) {
    const job: BuildJob = {
      id,
      projectId,
      ownerId,
      status: 'queued',
      createdAt: new Date().toISOString(),
    }
    this.jobs.set(id, job)
    return job
  }
  async get(id: string) {
    return this.jobs.get(id)
  }
  async cancel(id: string, ownerId: string) {
    const job = this.jobs.get(id)
    if (!job || job.ownerId !== ownerId) return
    job.status = 'cancelled'
    return job
  }
}
