import type { ProjectSchema } from '@functorz/schema'
export interface CloudProject {
  version: number
  project: ProjectSchema
}
export type BuildStatus =
  | 'queued'
  | 'generating'
  | 'building'
  | 'uploading'
  | 'success'
  | 'failed'
  | 'cancelled'
export interface BuildJob {
  id: string
  projectId: string
  status: BuildStatus
  createdAt: string
  qrCode?: string
  error?: { stage: BuildStatus; message: string }
}
export class CloudClient {
  private token = sessionStorage.getItem('functorz-token') ?? ''
  constructor(private readonly baseUrl = import.meta.env.VITE_API_URL ?? '/api') {}
  async login(email: string) {
    const result = await this.request<{ token: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email }) },
      false,
    )
    this.token = result.token
    sessionStorage.setItem('functorz-token', result.token)
  }
  async sync(project: ProjectSchema): Promise<CloudProject> {
    const current = await this.request<CloudProject | undefined>(
      `/projects/${project.id}`,
      {},
      true,
      true,
    )
    if (!current)
      return this.request('/projects', { method: 'POST', body: JSON.stringify(project) })
    return this.request(`/projects/${project.id}`, {
      method: 'PUT',
      body: JSON.stringify({ version: current.version, project }),
    })
  }
  async createBuild(projectId: string): Promise<BuildJob> {
    return this.request(`/projects/${projectId}/builds`, { method: 'POST' })
  }
  async getBuild(id: string): Promise<BuildJob> {
    return this.request(`/builds/${id}`)
  }
  private async request<T>(
    path: string,
    init: RequestInit = {},
    auth = true,
    allow404 = false,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(auth && this.token ? { authorization: `Bearer ${this.token}` } : {}),
        ...init.headers,
      },
    })
    if (allow404 && response.status === 404) return undefined as T
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: { code?: string } }
      throw new Error(body.error?.code ?? `HTTP_${response.status}`)
    }
    return response.json() as Promise<T>
  }
}
