import type { ProjectSchema } from '@functorz/schema'
export interface StoredProject {
  id: string
  ownerId: string
  version: number
  project: ProjectSchema
  updatedAt: string
}
export interface ProjectStore {
  list(ownerId: string): Promise<StoredProject[]>
  get(id: string): Promise<StoredProject | undefined>
  create(ownerId: string, project: ProjectSchema): Promise<StoredProject>
  update(
    ownerId: string,
    id: string,
    version: number,
    project: ProjectSchema,
  ): Promise<StoredProject>
  snapshots(id: string): Promise<StoredProject[]>
}
export class MemoryProjectStore implements ProjectStore {
  private data = new Map<string, StoredProject>()
  private history = new Map<string, StoredProject[]>()
  async list(ownerId: string) {
    return [...this.data.values()].filter((p) => p.ownerId === ownerId)
  }
  async get(id: string) {
    return this.data.get(id)
  }
  async create(ownerId: string, project: ProjectSchema) {
    if (this.data.has(project.id)) throw new StoreError('ALREADY_EXISTS', 409)
    const value = {
      id: project.id,
      ownerId,
      version: 1,
      project: structuredClone(project),
      updatedAt: new Date().toISOString(),
    }
    this.data.set(value.id, value)
    this.history.set(value.id, [structuredClone(value)])
    return value
  }
  async update(ownerId: string, id: string, version: number, project: ProjectSchema) {
    const current = this.data.get(id)
    if (!current || current.ownerId !== ownerId) throw new StoreError('NOT_FOUND', 404)
    if (current.version !== version) throw new StoreError('VERSION_CONFLICT', 409)
    const value = {
      ...current,
      version: version + 1,
      project: structuredClone(project),
      updatedAt: new Date().toISOString(),
    }
    this.data.set(id, value)
    this.history.get(id)!.push(structuredClone(value))
    return value
  }
  async snapshots(id: string) {
    return this.history.get(id) ?? []
  }
}
export class StoreError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
  ) {
    super(code)
  }
}
