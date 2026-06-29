import React from 'react'
import { createRoot } from 'react-dom/client'
import { previewMessage } from './preview-protocol'
import { validateProject, type ComponentNode } from '@functorz/schema'
import './styles.css'
function Node({ node }: { node: ComponentNode }) {
  const children = node.children.map((c) => <Node key={c.id} node={c} />)
  if (node.type === 'Text') return <span className="web-node">{String(node.props.text ?? '')}</span>
  if (node.type === 'Image')
    return <img className="type-image" src={String(node.props.src ?? '')} />
  if (node.type === 'Button')
    return <button className="type-button">{String(node.props.text ?? '')}</button>
  if (node.type === 'Input') return <input placeholder={String(node.props.placeholder ?? '')} />
  return <div className={`web-node type-${node.type.toLowerCase()}`}>{children}</div>
}
const root = createRoot(document.getElementById('preview-root')!)
root.render(<div />)
window.addEventListener('message', (event) => {
  if (event.origin !== location.origin) return
  const parsed = previewMessage.safeParse(event.data)
  if (!parsed.success) return
  const message = parsed.data
  if (message.type !== 'preview:update') return
  try {
    const project = validateProject(message.project)
    const page = project.pages.find((p) => p.id === message.pageId) ?? project.pages[0]!
    root.render(<Node node={page.root} />)
  } catch (error) {
    root.render(
      <div className="toast">{error instanceof Error ? error.message : 'Preview error'}</div>,
    )
  }
})
