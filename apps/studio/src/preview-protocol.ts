import { z } from 'zod'
import { projectSchema, type ProjectSchema } from '@functorz/schema'
export const PREVIEW_PROTOCOL_VERSION = 1
const update = z.object({
  protocol: z.literal(PREVIEW_PROTOCOL_VERSION),
  type: z.literal('preview:update'),
  requestId: z.string().min(1),
  project: projectSchema,
  pageId: z.string().uuid(),
})
const ready = z.object({
  protocol: z.literal(PREVIEW_PROTOCOL_VERSION),
  type: z.literal('preview:ready'),
  requestId: z.string().min(1),
})
const error = z.object({
  protocol: z.literal(PREVIEW_PROTOCOL_VERSION),
  type: z.literal('preview:error'),
  requestId: z.string().min(1),
  message: z.string(),
})
export const previewMessage = z.discriminatedUnion('type', [update, ready, error])
export type PreviewMessage = z.infer<typeof previewMessage>
function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function createPreviewUpdate(project: ProjectSchema, pageId: string): PreviewMessage {
  return { protocol: 1, type: 'preview:update', requestId: uuid(), project, pageId }
}
export function isTrustedPreviewMessage(
  event: MessageEvent,
  origin: string,
): event is MessageEvent<PreviewMessage> {
  return event.origin === origin && previewMessage.safeParse(event.data).success
}
