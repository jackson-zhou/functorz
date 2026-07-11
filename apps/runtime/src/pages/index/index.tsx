import { useEffect, useState } from 'react'
import { View } from '@tarojs/components'
import { SchemaRenderer } from '@functorz/runtime-renderer/dist'
import { demoProject } from '@functorz/schema/fixtures-dist'
import { validateProject, type ProjectSchema } from '@functorz/schema/dist'
import './index.css'

export default function Index() {
  const [project, setProject] = useState<ProjectSchema>(demoProject)
  const [pageId, setPageId] = useState('00000000-0000-4000-8000-000000000105')
  const [previewError, setPreviewError] = useState('')
  useEffect(() => {
    if (typeof window === 'undefined') return
    const parentOrigin = document.referrer
      ? new URL(document.referrer).origin
      : window.location.origin
    const listener = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== parentOrigin) return
      const data = event.data as {
        protocol?: number
        type?: string
        requestId?: string
        project?: ProjectSchema
        pageId?: string
      }
      if (data.protocol !== 1 || data.type !== 'preview:update' || !data.requestId) return
      try {
        const valid = validateProject(data.project)
        if (!valid.pages.some((page) => page.id === data.pageId))
          throw new Error('Preview page not found')
        setProject(valid)
        setPageId(data.pageId!)
        setPreviewError('')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid preview schema'
        setPreviewError(message)
        window.parent.postMessage(
          { protocol: 1, type: 'preview:error', requestId: data.requestId, message },
          event.origin,
        )
      }
    }
    window.addEventListener('message', listener)
    return () => window.removeEventListener('message', listener)
  }, [])
  useEffect(() => {
    function uuid(): string {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })
    }
    if (window.parent !== window) {
      const parentOrigin = document.referrer ? new URL(document.referrer).origin : location.origin
      window.parent.postMessage(
        { protocol: 1, type: 'preview:ready', requestId: uuid() },
        parentOrigin,
      )
    }
  }, [])
  return (
    <>
      {previewError && <View className="preview-error-overlay">{previewError}</View>}
      <SchemaRenderer project={project} pageId={pageId} />
    </>
  )
}
