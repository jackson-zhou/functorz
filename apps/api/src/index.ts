import { buildApp } from './app.js'
import { createDatabase, PostgresProjectStore } from './db.js'
import { BullBuildService } from './build-queue.js'

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '0.0.0.0'
const database = process.env.DATABASE_URL ? createDatabase() : undefined
const builds = process.env.REDIS_URL ? new BullBuildService() : undefined
const app = buildApp({
  store: database ? new PostgresProjectStore(database.pool) : undefined,
  builds,
})
if (database) app.addHook('onClose', async () => database.pool.end())
if (builds) app.addHook('onClose', async () => builds.close())

try {
  await app.listen({ host, port })
} catch (error) {
  app.log.error(error)
  process.exitCode = 1
}
