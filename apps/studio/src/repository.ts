import { validateProject, type ProjectSchema } from '@functorz/schema'
export interface LocalProjectRecord {
  project: ProjectSchema
  updatedAt: string
}
interface StoredProject {
  project: unknown
  updated_at: string
}
export interface LocalProjectRepository {
  list(): Promise<LocalProjectRecord[]>
  get(id: string): Promise<LocalProjectRecord | undefined>
  save(project: ProjectSchema): Promise<void>
  delete(id: string): Promise<void>
}
export class IndexedDbProjectRepository implements LocalProjectRepository {
  private db?: Promise<IDBDatabase>
  private open() {
    return (this.db ??= new Promise((resolve, reject) => {
      const request = indexedDB.open('functorz-studio', 1)
      request.onupgradeneeded = () =>
        request.result.createObjectStore('projects', { keyPath: 'project.id' })
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    }))
  }
  private async request<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const req = run(db.transaction('projects', mode).objectStore('projects'))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  async list() {
    return this.request('readonly', (s) => s.getAll()) as Promise<LocalProjectRecord[]>
  }
  async get(id: string) {
    return this.request('readonly', (s) => s.get(id)) as Promise<LocalProjectRecord | undefined>
  }
  async save(project: ProjectSchema) {
    const valid = validateProject(project)
    await this.request('readwrite', (s) =>
      s.put({ project: valid, updatedAt: new Date().toISOString() }),
    )
  }
  async delete(id: string) {
    await this.request('readwrite', (s) => s.delete(id))
  }
}
export class SurrealProjectRepository implements LocalProjectRepository {
  private database?: Promise<import('surrealdb').Surreal>
  private open() {
    return (this.database ??= (async () => {
      const [{ Surreal }, { createWasmWorkerEngines }] = await Promise.all([
        import('surrealdb'),
        import('@surrealdb/wasm'),
      ])
      const db = new Surreal({
        engines: createWasmWorkerEngines({
          defaults: { namespace: 'functorz', database: 'studio' },
        }),
      })
      await db.connect('indxdb://functorz-studio')
      await db.query(`
        DEFINE TABLE IF NOT EXISTS project SCHEMALESS;
        DEFINE INDEX IF NOT EXISTS project_id ON TABLE project COLUMNS project_id UNIQUE;
        DEFINE TABLE IF NOT EXISTS snapshot SCHEMALESS;
        DEFINE INDEX IF NOT EXISTS snapshot_project_time ON TABLE snapshot COLUMNS project_id, updated_at;
      `)
      return db
    })())
  }
  async list(): Promise<LocalProjectRecord[]> {
    const db = await this.open()
    const [rows] = await db.query<[StoredProject[]]>(
      'SELECT project, updated_at FROM project ORDER BY updated_at DESC',
    )
    return rows.flatMap((row) => toRecord(row))
  }
  async get(id: string): Promise<LocalProjectRecord | undefined> {
    const db = await this.open()
    const [current] = await db.query<[StoredProject[]]>(
      'SELECT project, updated_at FROM project WHERE project_id = $id LIMIT 1',
      { id },
    )
    const valid = current.flatMap((row) => toRecord(row))[0]
    if (valid) return valid
    const [snapshots] = await db.query<[StoredProject[]]>(
      'SELECT project, updated_at FROM snapshot WHERE project_id = $id ORDER BY updated_at DESC LIMIT 10',
      { id },
    )
    return snapshots.flatMap((row) => toRecord(row))[0]
  }
  async save(project: ProjectSchema) {
    const valid = validateProject(project)
    const db = await this.open()
    const updatedAt = new Date().toISOString()
    await db.query(
      `BEGIN TRANSACTION;
       UPSERT project SET project_id = $id, project = $project, updated_at = $updatedAt WHERE project_id = $id;
       CREATE snapshot SET project_id = $id, project = $project, updated_at = $updatedAt;
       COMMIT TRANSACTION;`,
      { id: valid.id, project: valid, updatedAt },
    )
  }
  async delete(id: string) {
    const db = await this.open()
    await db.query(
      'BEGIN TRANSACTION; DELETE project WHERE project_id = $id; DELETE snapshot WHERE project_id = $id; COMMIT TRANSACTION;',
      { id },
    )
  }
}
function toRecord(row: StoredProject): LocalProjectRecord[] {
  try {
    return [{ project: validateProject(row.project), updatedAt: row.updated_at }]
  } catch {
    return []
  }
}

export class FallbackProjectRepository implements LocalProjectRepository {
  constructor(
    private readonly primary: LocalProjectRepository,
    private readonly fallback: LocalProjectRepository,
    private readonly onFallback?: (error: unknown) => void,
  ) {}
  private async run<T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    try {
      return await primary()
    } catch (error) {
      this.onFallback?.(error)
      return fallback()
    }
  }
  list() {
    return this.run(
      () => this.primary.list(),
      () => this.fallback.list(),
    )
  }
  get(id: string) {
    return this.run(
      () => this.primary.get(id),
      () => this.fallback.get(id),
    )
  }
  save(project: ProjectSchema) {
    return this.run(
      () => this.primary.save(project),
      () => this.fallback.save(project),
    )
  }
  delete(id: string) {
    return this.run(
      () => this.primary.delete(id),
      () => this.fallback.delete(id),
    )
  }
}
export class MemoryProjectRepository implements LocalProjectRepository {
  records = new Map<string, LocalProjectRecord>()
  async list() {
    return [...this.records.values()]
  }
  async get(id: string) {
    return this.records.get(id)
  }
  async save(project: ProjectSchema) {
    const valid = validateProject(project)
    this.records.set(valid.id, {
      project: structuredClone(valid),
      updatedAt: new Date().toISOString(),
    })
  }
  async delete(id: string) {
    this.records.delete(id)
  }
}
export function scheduleAutoSave(repository: LocalProjectRepository, delay = 200) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (project: ProjectSchema, onDone: (ok: boolean) => void) => {
    clearTimeout(timer)
    timer = setTimeout(
      () =>
        void repository.save(project).then(
          () => onDone(true),
          () => onDone(false),
        ),
      delay,
    )
  }
}
