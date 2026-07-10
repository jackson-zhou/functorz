import { describe, expect, it } from 'vitest'
import { demoProject, petManagementPage } from './fixtures.js'
import {
  deserializeProject,
  serializeProject,
  validateProject,
  walk,
  type ComponentNode,
} from './index.js'
describe('project schema', () => {
  it('builds the pet management example from editable primitives', () => {
    const legacy = new Set(['AppHeader', 'PetCard', 'BottomNav'])
    const page = petManagementPage
    const nodes: ComponentNode[] = []
    walk(page.root, [], 0, (node) => nodes.push(node))
    expect(nodes.some((node) => legacy.has(node.type))).toBe(false)
    expect(nodes.filter((node) => node.type === 'Button' && node.props.text === '登录')).toHaveLength(4)
  })
  it('validates and round trips fixtures', () =>
    expect(deserializeProject(serializeProject(demoProject))).toEqual(demoProject))
  it('reports duplicate ids with a path', () => {
    const value = structuredClone(demoProject)
    const page = value.pages.find((item) => item.name === '电商首页')!
    page.root.children[1]!.id = page.root.children[0]!.id
    expect(() => validateProject(value)).toThrow(/Duplicate node id/)
  })
  it('rejects illegal leaf children', () => {
    const value = structuredClone(demoProject)
    const page = value.pages.find((item) => item.name === '电商首页')!
    page.root.children[0]!.children[0]!.children.push(page.root.children[1]!)
    expect(() => validateProject(value)).toThrow(/cannot contain children/)
  })
  it('rejects unknown components', () => {
    const value: any = structuredClone(demoProject)
    value.pages[0].root.children[0].type = 'Script'
    expect(() => validateProject(value)).toThrow()
  })
})
