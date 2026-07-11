import { describe, expect, it } from 'vitest'
import { demoProject, ecommercePage, petManagementPage } from './fixtures.js'
import {
  deserializeProject,
  serializeProject,
  validateProject,
  walk,
  type ComponentNode,
} from './index.js'
describe('project schema', () => {
  it('builds the pet management example from editable primitives', () => {
    const legacy = new Set(['AppHeader', 'PetCard'])
    const page = petManagementPage
    const nodes: ComponentNode[] = []
    walk(page.root, [], 0, (node) => nodes.push(node))
    expect(nodes.some((node) => legacy.has(node.type))).toBe(false)
    expect(nodes.filter((node) => node.type === 'Button' && node.props.text === '登录')).toHaveLength(4)
  })
  it('validates and round trips fixtures', () =>
    expect(deserializeProject(serializeProject(demoProject))).toEqual(demoProject))
  it('models ecommerce collections as data-bound list components', () => {
    const nodes: ComponentNode[] = []
    walk(ecommercePage.root, [], 0, (node) => nodes.push(node))
    expect(nodes.some((node) => node.type === 'Tabs' && node.props.dataSource === 'home.tabs')).toBe(true)
    expect(nodes.some((node) => node.type === 'KingKongList' && node.props.dataSource === 'home.kingKong')).toBe(true)
    expect(nodes.some((node) => node.type === 'ProductList' && node.props.dataSource === 'home.products')).toBe(true)
    expect(ecommercePage.root.events?.load?.edges.every((edge) => edge.source && edge.target)).toBe(true)
  })
  it('ensures every flow edge across all pages has source and target', () => {
    const flows: Array<{ path: string; flow: import('./index.js').Flow }> = []
    demoProject.pages.forEach((page) => {
      walk(page.root, [], 0, (node) => {
        if (!node.events) return
        Object.entries(node.events).forEach(([eventType, flow]) => {
          if (flow) flows.push({ path: `${page.name}/${node.type}/${eventType}`, flow })
        })
      })
    })
    expect(flows.length).toBeGreaterThan(0)
    flows.forEach(({ path, flow }) => {
      expect(flow.edges.length, `${path} should have edges`).toBeGreaterThan(0)
      flow.edges.forEach((edge) => {
        expect(edge.source, `${path} edge ${edge.id} missing source`).toBeTruthy()
        expect(edge.target, `${path} edge ${edge.id} missing target`).toBeTruthy()
      })
    })
  })
  it('reports duplicate ids with a path', () => {
    const value = structuredClone(demoProject)
    const page = value.pages.find((item) => item.name === '电商首页')!
    page.root.children[1]!.id = page.root.children[0]!.id
    expect(() => validateProject(value)).toThrow(/Duplicate node id/)
  })
  it('rejects illegal leaf children', () => {
    const value = structuredClone(demoProject)
    const page = value.pages.find((item) => item.name === '电商首页')!
    page.root.children[1]!.children[0]!.children.push(page.root.children[2]!)
    expect(() => validateProject(value)).toThrow(/cannot contain children/)
  })
  it('rejects unknown components', () => {
    const value: any = structuredClone(demoProject)
    value.pages[0].root.children[0].type = 'Script'
    expect(() => validateProject(value)).toThrow()
  })
})
