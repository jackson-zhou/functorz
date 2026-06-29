import { describe, expect, it } from 'vitest'
import { validateProject } from '@functorz/schema'
import { demoProject } from '@functorz/schema/fixtures'
import { CommandHistory, executeCommand, findNode } from './index.js'
const uuid = (() => {
  let i = 900
  return () => `00000000-0000-4000-8000-${String(i++).padStart(12, '0')}`
})()
describe('editor commands', () => {
  it('inserts, copies and removes without mutating input', () => {
    const original = structuredClone(demoProject)
    const parent = demoProject.pages[0]!.root.id
    let value = executeCommand(
      demoProject,
      {
        type: 'insert',
        pageId: demoProject.pages[0]!.id,
        parentId: parent,
        index: 0,
        componentType: 'Text',
      },
      uuid,
    )
    const id = value.pages[0]!.root.children[0]!.id
    value = executeCommand(value, { type: 'duplicate', nodeId: id }, uuid)
    value = executeCommand(value, { type: 'remove', nodeId: id })
    expect(value.pages[0]!.root.children).toHaveLength(original.pages[0]!.root.children.length + 1)
    expect(demoProject).toEqual(original)
  })
  it('blocks descendant cycles', () => {
    const section = demoProject.pages[0]!.root.children[0]!
    expect(() =>
      executeCommand(demoProject, {
        type: 'move',
        nodeId: section.id,
        parentId: section.children[0]!.id,
        index: 0,
      }),
    ).toThrow()
  })
  it('undoes and redoes consistently', () => {
    const history = new CommandHistory(demoProject)
    const id = demoProject.pages[0]!.root.children[0]!.children[0]!.id
    history.execute({ type: 'updateProps', nodeId: id, props: { text: 'changed' } })
    const changed = history.current
    expect(history.undo()).toBe(demoProject)
    expect(history.redo()).toBe(changed)
  })
  it('keeps unique ids over repeated copies', () => {
    let value = demoProject
    const id = demoProject.pages[0]!.root.children[0]!.id
    for (let i = 0; i < 100; i++)
      value = executeCommand(value, { type: 'duplicate', nodeId: id }, uuid)
    expect(findNode(value, id)).toBeDefined()
  })
  it('keeps the schema valid through 100 deterministic tree operations', () => {
    let value = structuredClone(demoProject)
    const root = value.pages[0]!.root
    for (let i = 0; i < 100; i++) {
      const insertedId = uuid()
      value = executeCommand(value, {
        type: 'insert',
        pageId: value.pages[0]!.id,
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
    const history = new CommandHistory(demoProject)
    expect(() =>
      history.execute({ type: 'remove', nodeId: demoProject.pages[0]!.root.id }),
    ).toThrow()
    expect(history.canUndo).toBe(false)
  })
  it('rejects invalid registry properties without changing the source', () => {
    const text = demoProject.pages[0]!.root.children[0]!.children[0]!
    expect(() =>
      executeCommand(demoProject, { type: 'updateProps', nodeId: text.id, props: { text: '' } }),
    ).toThrow('required')
    expect(text.props.text).toBe('让灵感变成小程序')
  })
})
