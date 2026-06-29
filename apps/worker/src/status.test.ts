import { describe, expect, it } from 'vitest'

import { getWorkerStatus } from './status.js'

describe('worker baseline', () => {
  it('starts in the idle state', () => {
    expect(getWorkerStatus()).toEqual({ service: 'worker', status: 'idle' })
  })
})
