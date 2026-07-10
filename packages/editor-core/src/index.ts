import { canAccept, createNode, validateProps } from '@functorz/component-registry'
import {
  validateProject,
  type ComponentNode,
  type ComponentType,
  type EventsSchema,
  type ProjectSchema,
} from '@functorz/schema'

export interface NodeLocation {
  node: ComponentNode
  parent: ComponentNode | null
  index: number
  pageIndex: number
}
export function findNode(project: ProjectSchema, id: string): NodeLocation | undefined {
  for (let pageIndex = 0; pageIndex < project.pages.length; pageIndex++) {
    const root = project.pages[pageIndex]!.root
    if (root.id === id) return { node: root, parent: null, index: 0, pageIndex }
    const found = findIn(root, id, pageIndex)
    if (found) return found
  }
  return undefined
}
function findIn(parent: ComponentNode, id: string, pageIndex: number): NodeLocation | undefined {
  for (let index = 0; index < parent.children.length; index++) {
    const node = parent.children[index]!
    if (node.id === id) return { node, parent, index, pageIndex }
    const found = findIn(node, id, pageIndex)
    if (found) return found
  }
}
function contains(root: ComponentNode, id: string): boolean {
  return root.id === id || root.children.some((child) => contains(child, id))
}
export type EditorCommand =
  | {
      type: 'insert'
      pageId: string
      parentId: string
      index: number
      componentType: ComponentType
      id?: string
    }
  | { type: 'move'; nodeId: string; parentId: string; index: number }
  | { type: 'remove'; nodeId: string }
  | { type: 'duplicate'; nodeId: string }
  | { type: 'reorder'; nodeId: string; direction: -1 | 1 }
  | { type: 'updateProps'; nodeId: string; props: Record<string, unknown> }
  | { type: 'updateStyle'; nodeId: string; style: ComponentNode['style'] }
  | { type: 'updateAction'; nodeId: string; action: ComponentNode['action'] | undefined }
  | { type: 'updateEvents'; nodeId: string; events: EventsSchema | undefined }
  | { type: 'updateTheme'; theme: Partial<ProjectSchema['theme']> }

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function executeCommand(
  source: ProjectSchema,
  command: EditorCommand,
  idFactory: () => string = uuid,
): ProjectSchema {
  const project = structuredClone(source)
  switch (command.type) {
    case 'insert': {
      const page = project.pages.find((item) => item.id === command.pageId)
      if (!page) throw new Error('Page not found')
      const parent = findNode(project, command.parentId)?.node
      if (!parent) throw new Error('Parent not found')
      if (!canAccept(parent.type, command.componentType))
        throw new Error(`${parent.type} does not accept ${command.componentType}`)
      parent.children.splice(
        clamp(command.index, parent.children.length),
        0,
        createNode(command.componentType, command.id ?? idFactory()),
      )
      break
    }
    case 'move': {
      const sourceLocation = findNode(project, command.nodeId)
      const target = findNode(project, command.parentId)?.node
      if (!sourceLocation?.parent || !target) throw new Error('Source or target not found')
      if (contains(sourceLocation.node, target.id))
        throw new Error('Cannot move a node into itself or its descendant')
      if (!canAccept(target.type, sourceLocation.node.type))
        throw new Error(`${target.type} does not accept ${sourceLocation.node.type}`)
      const sameParent = sourceLocation.parent.id === target.id
      const insertionIndex =
        sameParent && sourceLocation.index < command.index ? command.index - 1 : command.index
      sourceLocation.parent.children.splice(sourceLocation.index, 1)
      target.children.splice(clamp(insertionIndex, target.children.length), 0, sourceLocation.node)
      break
    }
    case 'remove': {
      const location = findNode(project, command.nodeId)
      if (!location?.parent) throw new Error('Root node cannot be removed')
      location.parent.children.splice(location.index, 1)
      break
    }
    case 'duplicate': {
      const location = findNode(project, command.nodeId)
      if (!location?.parent) throw new Error('Root node cannot be duplicated')
      const copy = cloneWithIds(location.node, idFactory)
      location.parent.children.splice(location.index + 1, 0, copy)
      break
    }
    case 'reorder': {
      const location = findNode(project, command.nodeId)
      if (!location?.parent) throw new Error('Root node cannot be reordered')
      const next = location.index + command.direction
      if (next < 0 || next >= location.parent.children.length) return source
      const [node] = location.parent.children.splice(location.index, 1)
      location.parent.children.splice(next, 0, node!)
      break
    }
    case 'updateProps': {
      const node = findNode(project, command.nodeId)?.node
      if (!node) throw new Error('Node not found')
      const props = { ...node.props, ...command.props }
      validateProps(node.type, props)
      node.props = props
      break
    }
    case 'updateStyle': {
      const node = findNode(project, command.nodeId)?.node
      if (!node) throw new Error('Node not found')
      node.style = command.style
      break
    }
    case 'updateAction': {
      const node = findNode(project, command.nodeId)?.node
      if (!node) throw new Error('Node not found')
      if (command.action) node.action = command.action
      else delete node.action
      break
    }
    case 'updateEvents': {
      const node = findNode(project, command.nodeId)?.node
      if (!node) throw new Error('Node not found')
      if (command.events) node.events = command.events
      else delete node.events
      break
    }
    case 'updateTheme': {
      project.theme = { ...project.theme, ...command.theme }
      break
    }
  }
  return validateProject(project)
}
const clamp = (index: number, length: number) => Math.max(0, Math.min(index, length))
function cloneWithIds(node: ComponentNode, idFactory: () => string): ComponentNode {
  return {
    ...structuredClone(node),
    id: idFactory(),
    children: node.children.map((child) => cloneWithIds(child, idFactory)),
  }
}

export class CommandHistory {
  #past: ProjectSchema[] = []
  #future: ProjectSchema[] = []
  constructor(
    public current: ProjectSchema,
    private readonly limit = 100,
  ) {}
  execute(command: EditorCommand, idFactory?: () => string) {
    const next = executeCommand(this.current, command, idFactory)
    this.#past.push(this.current)
    if (this.#past.length > this.limit) this.#past.shift()
    this.current = next
    this.#future = []
    return this.current
  }
  undo() {
    const previous = this.#past.pop()
    if (previous) {
      this.#future.push(this.current)
      this.current = previous
    }
    return this.current
  }
  redo() {
    const next = this.#future.pop()
    if (next) {
      this.#past.push(this.current)
      this.current = next
    }
    return this.current
  }
  get canUndo() {
    return this.#past.length > 0
  }
  get canRedo() {
    return this.#future.length > 0
  }
}
