import { describe, expect, it } from 'vitest'
import { demoProject } from './fixtures.js'
import { deserializeProject, serializeProject, validateProject } from './index.js'
describe('project schema', () => {
  it('validates and round trips fixtures', () =>
    expect(deserializeProject(serializeProject(demoProject))).toEqual(demoProject))
  it('reports duplicate ids with a path', () => {
    const value = structuredClone(demoProject)
    value.pages[0]!.root.children[1]!.id = value.pages[0]!.root.children[0]!.id
    expect(() => validateProject(value)).toThrow(/Duplicate node id/)
  })
  it('rejects illegal leaf children', () => {
    const value = structuredClone(demoProject)
    value.pages[0]!.root.children[0]!.children[0]!.children.push(value.pages[0]!.root.children[1]!)
    expect(() => validateProject(value)).toThrow(/cannot contain children/)
  })
  it('rejects unknown components', () => {
    const value: any = structuredClone(demoProject)
    value.pages[0].root.children[0].type = 'Script'
    expect(() => validateProject(value)).toThrow()
  })
})
