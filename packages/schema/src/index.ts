import { z } from 'zod'

export const SCHEMA_VERSION = 2 as const
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
  'Tabs',
  'Badge',
  'Tag',
  'FAB',
  'AppHeader',
  'PetCard',
  'BottomNav',
  'SearchBar',
  'ProductCard',
  'KingKongList',
  'ProductList',
  'Countdown',
] as const
export type ComponentType = (typeof componentTypes)[number]

export const styleSchema = z
  .object({
    color: z.string().max(32).optional(),
    backgroundColor: z.string().max(32).optional(),
    fontSize: z.enum(['xs', 'sm', 'md', 'lg', 'xl']).optional(),
    spacing: z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl']).optional(),
    radius: z.enum(['none', 'sm', 'md', 'lg', 'pill']).optional(),
    gap: z.enum(['none', 'xs', 'sm', 'md', 'lg']).optional(),
    columns: z.number().int().min(1).max(4).optional(),
    width: z.number().int().min(0).max(2000).optional(),
    height: z.number().int().min(0).max(2000).optional(),
    flex: z.number().min(0).max(20).optional(),
    borderWidth: z.number().int().min(0).max(20).optional(),
    borderColor: z.string().max(32).optional(),
    fontWeight: z.enum(['normal', 'medium', 'semibold', 'bold']).optional(),
    textAlign: z.enum(['left', 'center', 'right']).optional(),
    objectFit: z.enum(['cover', 'contain', 'fill']).optional(),
  })
  .strict()

export const flowNodeTypes = [
  'start',
  'end',
  'api',
  'alert',
  'navigate',
  'condition',
  'setData',
] as const
export type FlowNodeType = (typeof flowNodeTypes)[number]

export const apiConfigSchema = z
  .object({
    url: z.string(),
    method: z.enum(['GET', 'POST']),
    params: z.record(z.string(), z.string()).optional(),
    body: z.string().optional(),
  })
  .strict()
export type ApiConfig = z.infer<typeof apiConfigSchema>

export const alertConfigSchema = z
  .object({
    type: z.enum(['success', 'error', 'info']),
    message: z.string(),
  })
  .strict()
export type AlertConfig = z.infer<typeof alertConfigSchema>

export const navigateConfigSchema = z
  .object({
    pageId: z.string().uuid(),
    params: z.record(z.string(), z.string()).optional(),
  })
  .strict()
export type NavigateConfig = z.infer<typeof navigateConfigSchema>

export const setDataConfigSchema = z
  .object({
    target: z.string(),
    source: z.string(),
  })
  .strict()
export type SetDataConfig = z.infer<typeof setDataConfigSchema>

export const conditionConfigSchema = z
  .object({
    expression: z.string(),
  })
  .strict()
export type ConditionConfig = z.infer<typeof conditionConfigSchema>

export const nodeConfigSchema = z.any()
export type NodeConfig = z.infer<typeof nodeConfigSchema>

export const flowNodeSchema = z
  .object({
    id: z.string().uuid(),
    type: z.enum(flowNodeTypes),
    label: z.string(),
    position: z.object({ x: z.number(), y: z.number() }),
    config: nodeConfigSchema,
  })
  .strict()
export type FlowNode = z.infer<typeof flowNodeSchema>

export const flowEdgeSchema = z
  .object({
    id: z.string().uuid(),
    source: z.string().uuid().optional(),
    target: z.string().uuid().optional(),
    sourcePort: z.string().optional(),
    targetPort: z.string().optional(),
    sourcePoint: z.object({ x: z.number(), y: z.number() }).optional(),
    targetPoint: z.object({ x: z.number(), y: z.number() }).optional(),
    label: z.string().optional(),
    arrow: z.enum(['forward', 'backward', 'both', 'none']).optional(),
  })
  .strict()
export type FlowEdge = z.infer<typeof flowEdgeSchema>

export const flowSchema = z
  .object({
    nodes: z.array(flowNodeSchema),
    edges: z.array(flowEdgeSchema),
  })
  .strict()
export type Flow = z.infer<typeof flowSchema>

export const eventsSchema = z
  .object({
    tap: flowSchema.optional(),
    load: flowSchema.optional(),
    show: flowSchema.optional(),
    scroll: flowSchema.optional(),
  })
  .strict()
export type EventsSchema = z.infer<typeof eventsSchema>

export interface ComponentNode {
  id: string
  type: ComponentType
  props: Record<string, unknown>
  style?: z.infer<typeof styleSchema>
  events?: EventsSchema
  children: ComponentNode[]
}
export const componentNodeSchema: z.ZodType<ComponentNode> = z.lazy(() =>
  z
    .object({
      id: z.string().uuid(),
      type: z.enum(componentTypes),
      props: z.record(z.string(), z.unknown()).default({}),
      style: styleSchema.optional(),
      events: eventsSchema.optional(),
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
  'Tabs',
])
const leaves = new Set<ComponentType>([
  'Text',
  'Image',
  'Button',
  'Divider',
  'Spacer',
  'Input',
  'Badge',
  'Tag',
  'FAB',
  'AppHeader',
  'PetCard',
  'BottomNav',
  'SearchBar',
  'ProductCard',
  'KingKongList',
  'ProductList',
  'Countdown',
])
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

/** Strips fields removed between schema v1 and v2. */
export const v1ToV2: Migration = {
  from: 1,
  to: 2,
  migrate(input: unknown): unknown {
    const project = structuredClone(input) as Record<string, unknown>
    const removedStyleKeys = new Set([
      'overflow', 'position', 'top', 'right', 'bottom', 'left', 'zIndex',
      'minHeight', 'align',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    ])
    function strip(node: Record<string, unknown>) {
      delete node.action
      if (node.style && typeof node.style === 'object') {
        const style = node.style as Record<string, unknown>
        for (const key of removedStyleKeys) delete style[key]
      }
      const children = node.children as Record<string, unknown>[] | undefined
      if (children) children.forEach(strip)
    }
    const pages = project.pages as Record<string, unknown>[] | undefined
    if (pages) {
      for (const page of pages) {
        const root = page.root as Record<string, unknown> | undefined
        if (root) strip(root)
      }
    }
    project.version = 2
    return project
  },
}
export function serializeProject(project: ProjectSchema): string {
  return JSON.stringify(migrateProject(project, [v1ToV2]), null, 2)
}
export function deserializeProject(json: string): ProjectSchema {
  return migrateProject(JSON.parse(json), [v1ToV2])
}
