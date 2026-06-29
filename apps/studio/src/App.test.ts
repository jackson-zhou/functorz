import { describe, expect, it } from 'vitest'

import { PRODUCT_NAME } from './App'

describe('studio baseline', () => {
  it('exposes a stable product name', () => {
    expect(PRODUCT_NAME).toBe('Functorz Studio')
  })
})
