import { Pool, type PoolClient } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { validateProject, type ProjectSchema } from '@functorz/schema'
import { StoreError, type ProjectStore, type StoredProject } from './store.js'

export function createDatabase(
  connectionString = process.env.DATABASE_URL ??
    'postgres://functorz:functorz@localhost:5432/functorz',
) {
  const pool = new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_SIZE ?? 10),
    connectionTimeoutMillis: 5_000,
  })
  return { pool, db: drizzle(pool) }
}
export class PostgresProjectStore implements ProjectStore {
  constructor(private readonly pool: Pool) {}
  async ensureUser(client: PoolClient, ownerId: string) {
    await client.query(
      'INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',
      [ownerId, `${ownerId}@local.invalid`, 'external-auth'],
    )
  }
  async list(ownerId: string) {
    const result = await this.pool.query(
      'SELECT id,owner_id,version,schema,updated_at FROM projects WHERE owner_id=$1 ORDER BY updated_at DESC',
      [ownerId],
    )
    return result.rows.map(mapRow)
  }
  async get(id: string) {
    const result = await this.pool.query(
      'SELECT id,owner_id,version,schema,updated_at FROM projects WHERE id=$1',
      [id],
    )
    return result.rows[0] ? mapRow(result.rows[0]) : undefined
  }
  async create(ownerId: string, project: ProjectSchema) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await this.ensureUser(client, ownerId)
      const result = await client.query(
        'INSERT INTO projects(id,owner_id,version,schema) VALUES($1,$2,1,$3) RETURNING id,owner_id,version,schema,updated_at',
        [project.id, ownerId, project],
      )
      await client.query(
        'INSERT INTO project_snapshots(project_id,version,schema) VALUES($1,1,$2)',
        [project.id, project],
      )
      await client.query('COMMIT')
      return mapRow(result.rows[0])
    } catch (error) {
      await client.query('ROLLBACK')
      if ((error as { code?: string }).code === '23505') throw new StoreError('ALREADY_EXISTS', 409)
      throw error
    } finally {
      client.release()
    }
  }
  async update(ownerId: string, id: string, version: number, project: ProjectSchema) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await client.query(
        'UPDATE projects SET schema=$1,version=version+1,updated_at=now() WHERE id=$2 AND owner_id=$3 AND version=$4 RETURNING id,owner_id,version,schema,updated_at',
        [project, id, ownerId, version],
      )
      if (!result.rows[0]) {
        const exists = await client.query(
          'SELECT version FROM projects WHERE id=$1 AND owner_id=$2',
          [id, ownerId],
        )
        throw new StoreError(
          exists.rows[0] ? 'VERSION_CONFLICT' : 'NOT_FOUND',
          exists.rows[0] ? 409 : 404,
        )
      }
      await client.query(
        'INSERT INTO project_snapshots(project_id,version,schema) VALUES($1,$2,$3)',
        [id, version + 1, project],
      )
      await client.query('COMMIT')
      return mapRow(result.rows[0])
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
  async snapshots(id: string) {
    const result = await this.pool.query(
      'SELECT p.id,p.owner_id,s.version,s.schema,s.created_at AS updated_at FROM project_snapshots s JOIN projects p ON p.id=s.project_id WHERE s.project_id=$1 ORDER BY s.version DESC',
      [id],
    )
    return result.rows.map(mapRow)
  }
}
function mapRow(row: Record<string, unknown>): StoredProject {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    version: Number(row.version),
    project: validateProject(row.schema),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  }
}
