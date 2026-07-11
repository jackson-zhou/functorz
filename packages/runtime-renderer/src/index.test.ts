import { describe, expect, it } from 'vitest'
import type { ComponentNode } from '@functorz/schema'
import { tokenStyle } from './styles.js'
import { evaluateCondition, getPath, setPath } from './flow-utils.js'
describe('runtime renderer', () => {
  it('maps whitelisted layout controls and ignores arbitrary props', () => {
    const node: ComponentNode = {
      id: '00000000-0000-4000-8000-000000000001',
      type: 'Section',
      props: { style: 'position:fixed' },
      style: { spacing: 'md', radius: 'lg', borderWidth: 2, borderColor: '#ff0000' },
      children: [],
    }
    expect(tokenStyle(node)).toMatchObject({
      padding: 16,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: '#ff0000',
    })
  })
  it('reads and immutably writes runtime data paths', () => {
    const current = { home: { products: [] } }
    const next = setPath(current, 'home.products', [{ id: 'p1' }])
    expect(getPath(next, 'home.products.0.id')).toBe('p1')
    expect(current.home.products).toEqual([])
    expect(() => setPath({}, '__proto__.polluted', true)).toThrow(/Invalid data target/)
  })
  it('evaluates the safe condition subset used by flows', () => {
    expect(evaluateCondition('response.code == 0 && response.message contains ok', {
      response: { code: 0, message: 'ok response' },
    })).toBe(true)
  })
})
