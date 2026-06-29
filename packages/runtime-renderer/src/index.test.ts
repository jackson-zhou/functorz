import { describe, expect, it } from 'vitest'
import type { ComponentNode } from '@functorz/schema'
import { tokenStyle } from './styles.js'
describe('runtime renderer', () => {
  it('maps only whitelisted design tokens', () => {
    const node: ComponentNode = {
      id: '00000000-0000-4000-8000-000000000001',
      type: 'Section',
      props: { style: 'position:fixed' },
      style: { spacing: 'md', radius: 'lg' },
      children: [],
    }
    expect(tokenStyle(node)).toMatchObject({ padding: 16, borderRadius: 18 })
    expect(tokenStyle(node)).not.toHaveProperty('position')
  })
})
