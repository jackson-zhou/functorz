import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createDatabase } from './db.js'
const { pool } = createDatabase()
try {
  await pool.query(
    await readFile(
      resolve(dirname(fileURLToPath(import.meta.url)), '../drizzle/0001_initial.sql'),
      'utf8',
    ),
  )
} finally {
  await pool.end()
}
