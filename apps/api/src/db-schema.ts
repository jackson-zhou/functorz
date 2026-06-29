import { bigint, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
export const users = pgTable('users', {
  id: uuid().primaryKey(),
  email: text().notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
export const projects = pgTable('projects', {
  id: uuid().primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  version: integer().notNull().default(1),
  schema: jsonb().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
export const assets = pgTable('assets', {
  id: uuid().primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  storageKey: text('storage_key').notNull(),
  contentType: text('content_type').notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
})
