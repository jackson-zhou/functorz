import { describe, expect, it } from 'vitest'
import type { ComponentNode } from '@functorz/schema'
import { tokenStyle } from './styles.js'
describe('runtime renderer', () => {
  it('maps whitelisted layout controls and ignores arbitrary props', () => {
    const node: ComponentNode = {
      id: '00000000-0000-4000-8000-000000000001',
      type: 'Section',
      props: { style: 'position:fixed' },
      style: { spacing: 'md', radius: 'lg', position: 'absolute', right: 12 },
      children: [],
    }
    expect(tokenStyle(node)).toMatchObject({
      padding: 16,
      borderRadius: 18,
      position: 'absolute',
      right: 12,
    })
  })
})
