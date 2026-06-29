import { z } from 'zod'

export const SCHEMA_VERSION = 1 as const
export const componentTypes = [
  'Page',
  'Section',
  'Flex',
  'Grid',
  'Text',
  'Image',
  'Button',
  'Card',
  'Divider',
  'Spacer',
  'Swiper',
  'Form',
  'Input',
] as const
export type ComponentType = (typeof componentTypes)[number]

export const styleSchema = z
  .object({
    color: z.string().max(32).optional(),
    backgroundColor: z.string().max(32).optional(),
    fontSize: z.enum(['xs', 'sm', 'md', 'lg', 'xl']).optional(),
    spacing: z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl']).optional(),
    radius: z.enum(['none', 'sm', 'md', 'lg', 'pill']).optional(),
    align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
    gap: z.enum(['none', 'xs', 'sm', 'md', 'lg']).optional(),
    columns: z.number().int().min(1).max(4).optional(),
  })
  .strict()

export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('navigate'), pageId: z.string().uuid() }).strict(),
  z.object({ type: z.literal('back') }).strict(),
  z.object({ type: z.literal('submit'), formId: z.string().uuid() }).strict(),
])
export type ActionSchema = z.infer<typeof actionSchema>

export interface ComponentNode {
  id: string
  type: ComponentType
  props: Record<string, unknown>
  style?: z.infer<typeof styleSchema>
  action?: ActionSchema
  children: ComponentNode[]
}
export const componentNodeSchema: z.ZodType<ComponentNode> = z.lazy(() =>
  z
    .object({
      id: z.string().uuid(),
      type: z.enum(componentTypes),
      props: z.record(z.string(), z.unknown()).default({}),
      style: styleSchema.optional(),
      action: actionSchema.optional(),
      children: z.array(componentNodeSchema).default([]),
    })
    .strict(),
)

export const pageSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1).max(80),
    route: z.string().regex(/^\/[a-z0-9][a-z0-9\-/]*$/),
    root: componentNodeSchema,
  })
  .strict()
export type PageSchema = z.infer<typeof pageSchema>
export const themeSchema = z
  .object({
    primaryColor: z.string().max(32),
    backgroundColor: z.string().max(32),
    textColor: z.string().max(32),
    radius: z.enum(['none', 'sm', 'md', 'lg']),
  })
  .strict()
export type ThemeSchema = z.infer<typeof themeSchema>
export const projectSchema = z
  .object({
    version: z.literal(SCHEMA_VERSION),
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    theme: themeSchema,
    pages: z.array(pageSchema).min(1),
  })
  .strict()
export type ProjectSchema = z.infer<typeof projectSchema>

const containers = new Set<ComponentType>([
  'Page',
  'Section',
  'Flex',
  'Grid',
  'Card',
  'Swiper',
  'Form',
])
const leaves = new Set<ComponentType>(['Text', 'Image', 'Button', 'Divider', 'Spacer', 'Input'])
export function validateProject(input: unknown): ProjectSchema {
  const parsed = projectSchema.parse(input)
  const ids = new Map<string, string>()
  for (const [pi, page] of parsed.pages.entries()) {
    if (page.root.type !== 'Page')
      throw new z.ZodError([
        {
          code: 'custom',
          path: ['pages', pi, 'root', 'type'],
          message: 'Page root must use Page component',
        },
      ])
    walk(page.root, ['pages', pi, 'root'], 0, (node, path, depth) => {
      if (depth > 12) throw issue(path, 'Maximum component depth is 12')
      const previous = ids.get(node.id)
      if (previous) throw issue([...path, 'id'], `Duplicate node id; first seen at ${previous}`)
      ids.set(node.id, path.join('.'))
      if (leaves.has(node.type) && node.children.length)
        throw issue([...path, 'children'], `${node.type} cannot contain children`)
      if (!containers.has(node.type) && node.children.length)
        throw issue([...path, 'children'], `${node.type} is not a container`)
      if (node.type === 'Form' && node.children.some((child) => child.type === 'Form'))
        throw issue([...path, 'children'], 'Forms cannot be nested')
      if (
        node.type === 'Swiper' &&
        node.children.some((child) => child.type !== 'Section' && child.type !== 'Image')
      )
        throw issue([...path, 'children'], 'Swiper accepts only Section or Image children')
    })
  }
  return parsed
}
function issue(path: (string | number)[], message: string): z.ZodError {
  return new z.ZodError([{ code: 'custom', path, message }])
}
export function walk(
  node: ComponentNode,
  path: (string | number)[],
  depth: number,
  visitor: (node: ComponentNode, path: (string | number)[], depth: number) => void,
): void {
  visitor(node, path, depth)
  node.children.forEach((child, i) => walk(child, [...path, 'children', i], depth + 1, visitor))
}

export interface Migration {
  from: number
  to: number
  migrate(input: unknown): unknown
}
export function migrateProject(input: unknown, migrations: Migration[] = []): ProjectSchema {
  let current = structuredClone(input) as { version?: number }
  while (current.version !== SCHEMA_VERSION) {
    const migration = migrations.find((item) => item.from === current.version)
    if (!migration) throw new Error(`No migration from schema version ${String(current.version)}`)
    current = migration.migrate(current) as { version?: number }
  }
  return validateProject(current)
}
export function serializeProject(project: ProjectSchema): string {
  return JSON.stringify(validateProject(project), null, 2)
}
export function deserializeProject(json: string): ProjectSchema {
  return validateProject(JSON.parse(json))
}
