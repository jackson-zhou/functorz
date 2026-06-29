import { describe, expect, it } from 'vitest'
import { demoProject } from '@functorz/schema/fixtures'
import { createPreviewUpdate, isTrustedPreviewMessage, previewMessage } from './preview-protocol'

describe('preview protocol', () => {
  it('creates versioned schema-validated updates', () => {
    expect(
      previewMessage.parse(createPreviewUpdate(demoProject, demoProject.pages[0]!.id)).protocol,
    ).toBe(1)
  })
  it('rejects foreign origins and malformed messages', () => {
    const message = createPreviewUpdate(demoProject, demoProject.pages[0]!.id)
    expect(
      isTrustedPreviewMessage(
        { origin: 'https://evil.test', data: message } as MessageEvent,
        'https://studio.test',
      ),
    ).toBe(false)
    expect(previewMessage.safeParse({ protocol: 1, type: 'preview:update' }).success).toBe(false)
  })
})
