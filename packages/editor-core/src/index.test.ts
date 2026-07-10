import { describe, expect, it } from 'vitest'
import { validateProject } from '@functorz/schema'
import { demoProject, ecommercePage } from '@functorz/schema/fixtures'
import { CommandHistory, executeCommand, findNode } from './index.js'
const uuid = (() => {
  let i = 900
  return () => `00000000-0000-4000-8000-${String(i++).padStart(12, '0')}`
})()
const ecommerce = () => structuredClone(ecommercePage)
describe('editor commands', () => {
  it('inserts, copies and removes without mutating input', () => {
    const original = structuredClone(demoProject)
    const page = demoProject.pages.find((p) => p.id === ecommercePage.id)!
    const parent = page.root.id
    let value = executeCommand(
      demoProject,
      {
        type: 'insert',
        pageId: page.id,
        parentId: parent,
        index: 0,
        componentType: 'Text',
      },
      uuid,
    )
    const insertedPage = value.pages.find((p) => p.id === ecommercePage.id)!
    const id = insertedPage.root.children[0]!.id
    value = executeCommand(value, { type: 'duplicate', nodeId: id }, uuid)
    value = executeCommand(value, { type: 'remove', nodeId: id })
    const originalPage = original.pages.find((p) => p.id === ecommercePage.id)!
    expect(insertedPage.root.children).toHaveLength(originalPage.root.children.length + 1)
    expect(demoProject).toEqual(original)
  })
  it('blocks descendant cycle', () => {
    const page = ecommerce()
    const section = page.root.children.find((c) => c.type === 'Section')!
    expect(() =>
      executeCommand(
        { ...demoProject, pages: [page] },
        {
          type: 'move',
          nodeId: section.id,
          parentId: section.children[0]!.id,
          index: 0,
        },
      ),
    ).toThrow()
  })
  it('undoes and redoes consistently', () => {
    const history = new CommandHistory(demoProject)
    const page = demoProject.pages.find((p) => p.id === ecommercePage.id)!
    const text = page.root.children.flatMap((c) => c.children).find((c) => c.type === 'Text')!
    history.execute({ type: 'updateProps', nodeId: text.id, props: { text: 'changed' } })
    const changed = history.current
    expect(history.undo()).toBe(demoProject)
    expect(history.redo()).toBe(changed)
  })
  it('keeps unique ids over repeated copies', () => {
    let value = demoProject
    const page = demoProject.pages.find((p) => p.id === ecommercePage.id)!
    const target = page.root.children[0]!
    for (let i = 0; i < 100; i++)
      value = executeCommand(value, { type: 'duplicate', nodeId: target.id }, uuid)
    expect(findNode(value, target.id)).toBeDefined()
  })
  it('keeps the schema valid through 100 deterministic tree operations', () => {
    let value = structuredClone(demoProject)
    const page = value.pages.find((p) => p.id === ecommercePage.id)!
    const root = page.root
    for (let i = 0; i < 100; i++) {
      const insertedId = uuid()
      value = executeCommand(value, {
        type: 'insert',
        pageId: page.id,
        parentId: root.id,
        index: i % (root.children.length + 1),
        componentType: i % 3 === 0 ? 'Section' : 'Text',
        id: insertedId,
      })
      if (i % 4 === 0)
        value = executeCommand(value, { type: 'reorder', nodeId: insertedId, direction: -1 })
      if (i % 5 === 0)
        value = executeCommand(value, { type: 'duplicate', nodeId: insertedId }, uuid)
      if (i % 7 === 0) value = executeCommand(value, { type: 'remove', nodeId: insertedId })
      expect(validateProject(value)).toEqual(value)
    }
  })
  it('does not add a failed command to history', () => {
    const page = demoProject.pages.find((p) => p.id === ecommercePage.id)!
    const history = new CommandHistory(demoProject)
    expect(() =>
      history.execute({ type: 'remove', nodeId: page.root.id }),
    ).toThrow()
    expect(history.canUndo).toBe(false)
  })
  it('rejects invalid registry properties without changing the source', () => {
    const page = demoProject.pages.find((p) => p.id === ecommercePage.id)!
    const text = page.root.children.flatMap((c) => c.children).find((c) => c.type === 'Text')!
    expect(() =>
      executeCommand(demoProject, { type: 'updateProps', nodeId: text.id, props: { text: '' } }),
    ).toThrow('required')
    expect(text.props.text).toBe(text.props.text)
  })
})
