import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { componentRegistry } from '@functorz/component-registry'
import { findNode } from '@functorz/editor-core'
import { serializeProject, type ComponentNode, type ComponentType } from '@functorz/schema'
import {
  FallbackProjectRepository,
  IndexedDbProjectRepository,
  SurrealProjectRepository,
  scheduleAutoSave,
} from './repository'
import { createPreviewUpdate, previewMessage } from './preview-protocol'
import { importProjectJson, selectCurrentPage, selectSelectedNode, useEditorStore } from './store'
import { CloudClient } from './cloud'
export const PRODUCT_NAME = 'Functorz Studio'
const repository =
  typeof indexedDB === 'undefined'
    ? undefined
    : new FallbackProjectRepository(
        new SurrealProjectRepository(),
        new IndexedDbProjectRepository(),
      )
const cloud = typeof sessionStorage === 'undefined' ? undefined : new CloudClient()

export function App() {
  const state = useEditorStore()
  const page = useEditorStore(selectCurrentPage)
  const selected = useEditorStore(selectSelectedNode)
  const [notice, setNotice] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const save = useMemo(() => (repository ? scheduleAutoSave(repository) : undefined), [])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return
    const target = findNode(state.project, String(over.id))
    if (!target) return
    const targetIsContainer = componentRegistry[target.node.type].container
    const parentId = targetIsContainer ? target.node.id : target.parent?.id
    const index = targetIsContainer ? target.node.children.length : target.index
    if (!parentId) return
    try {
      const componentType = active.data.current?.componentType as ComponentType | undefined
      if (componentType) {
        state.execute({ type: 'insert', pageId: page.id, parentId, index, componentType })
      } else {
        const nodeId = active.data.current?.nodeId as string | undefined
        if (nodeId && nodeId !== over.id) state.execute({ type: 'move', nodeId, parentId, index })
      }
      setNotice('布局已更新')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '不支持此处放置')
    }
  }
  useEffect(() => {
    if (state.saveState === 'saving' && save)
      save(state.project, (ok) => useEditorStore.setState({ saveState: ok ? 'saved' : 'error' }))
  }, [state.project, state.saveState, save])
  useEffect(() => {
    if (!repository) return
    let active = true
    void repository.get(state.project.id).then(
      (record) => {
        if (active && record) {
          useEditorStore.getState().replace(record.project, false)
          setNotice('已恢复本地草稿')
        }
      },
      () => active && setNotice('本地数据库不可用，将仅保留当前会话数据'),
    )
    return () => {
      active = false
    }
  }, [])
  const exportJson = () => {
    const blob = new Blob([serializeProject(state.project)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'functorz-project.json'
    a.click()
    URL.revokeObjectURL(url)
  }
  const syncCloud = async () => {
    if (!cloud) return
    try {
      await cloud.login('developer@functorz.local')
      const result = await cloud.sync(useEditorStore.getState().project)
      setNotice(`云端已同步（版本 ${result.version}）`)
    } catch (error) {
      setNotice(
        error instanceof Error && error.message === 'VERSION_CONFLICT'
          ? '云端版本冲突，请刷新后重试'
          : '云端同步失败',
      )
    }
  }
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="studio">
        <header className="toolbar">
          <div className="brand">
            <span className="brand-mark">F</span>
            <strong>{PRODUCT_NAME}</strong>
            <span className="badge">V1</span>
          </div>
          <div className="toolbar-actions">
            <button onClick={state.undo} disabled={!state.history.canUndo}>
              撤销
            </button>
            <button onClick={state.redo} disabled={!state.history.canRedo}>
              重做
            </button>
            <button onClick={() => importRef.current?.click()}>导入</button>
            <button onClick={exportJson}>导出 JSON</button>
            <button onClick={() => void syncCloud()}>同步云端</button>
            <span className={`save ${state.saveState}`}>
              {state.saveState === 'saved'
                ? '已保存'
                : state.saveState === 'saving'
                  ? '保存中…'
                  : '本地保存失败'}
            </span>
          </div>
          <input
            ref={importRef}
            hidden
            type="file"
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file)
                void file.text().then((text) => {
                  try {
                    state.replace(importProjectJson(text))
                    setNotice('项目已导入')
                  } catch (error) {
                    setNotice(error instanceof Error ? error.message : '导入失败')
                  }
                })
            }}
          />
        </header>
        <aside className="left-panel">
          <PanelTitle title="页面" />
          <div className="page-list">
            {state.project.pages.map((item) => (
              <button
                className={item.id === page.id ? 'active' : ''}
                key={item.id}
                onClick={() => state.setPage(item.id)}
              >
                <span>{item.name}</span>
                <small>{item.route}</small>
              </button>
            ))}
          </div>
          <PanelTitle title="组件" />
          <div className="component-grid">
            {Object.values(componentRegistry)
              .filter((item) => item.type !== 'Page')
              .map((item) => (
                <PaletteItem key={item.type} type={item.type} label={item.label} />
              ))}
          </div>
        </aside>
        <main className="workspace">
          <div className="canvas-head">
            <span>{page.name}</span>
            <span>390 × 844</span>
          </div>
          <div className="phone">
            <div className="phone-top">
              <span>9:41</span>
              <i />
              <span>●●●</span>
            </div>
            <div className="phone-title">{page.name}</div>
            <WebNode node={page.root} selectedId={state.selectedId} onSelect={state.select} />
          </div>
          {notice && <div className="toast">{notice}</div>}
        </main>
        <aside className="right-panel">
          <PanelTitle title="组件树" />
          <NodeTree node={page.root} />
          <PanelTitle title="属性" />
          {selected ? (
            <PropertyPanel node={selected} />
          ) : (
            <div className="empty">选择画布中的组件进行编辑</div>
          )}
          <ThemePanel />
          <PreviewPanel />
        </aside>
      </div>
    </DndContext>
  )
}
function PaletteItem({ type, label }: { type: ComponentType; label: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { componentType: type },
  })
  return (
    <div
      ref={setNodeRef}
      className={`component-item ${isDragging ? 'dragging' : ''}`}
      {...listeners}
      {...attributes}
    >
      <span className="component-icon">{label.slice(0, 1)}</span>
      {label}
    </div>
  )
}
function PanelTitle({ title }: { title: string }) {
  return <h2 className="panel-title">{title}</h2>
}
function NodeTree({ node, depth = 0 }: { node: ComponentNode; depth?: number }) {
  const selectedId = useEditorStore((s) => s.selectedId)
  return (
    <div>
      {
        <button
          className={`tree-node ${selectedId === node.id ? 'active' : ''}`}
          style={{ paddingLeft: 12 + depth * 14 }}
          onClick={() => useEditorStore.getState().select(node.id)}
        >
          {componentRegistry[node.type].label}
          <small>{String(node.props.text ?? node.props.label ?? '')}</small>
        </button>
      }
      {node.children.map((child) => (
        <NodeTree node={child} depth={depth + 1} key={child.id} />
      ))}
    </div>
  )
}
function PropertyPanel({ node }: { node: ComponentNode }) {
  const execute = useEditorStore((s) => s.execute)
  const definition = componentRegistry[node.type]
  return (
    <div className="properties">
      <div className="selection-title">
        <strong>{definition.label}</strong>
        <div>
          <button onClick={() => execute({ type: 'duplicate', nodeId: node.id })}>复制</button>
          {node.type !== 'Page' && (
            <button className="danger" onClick={() => execute({ type: 'remove', nodeId: node.id })}>
              删除
            </button>
          )}
        </div>
      </div>
      {definition.properties.map((field) => (
        <label key={field.key}>
          {field.label}
          {field.kind === 'boolean' ? (
            <input
              type="checkbox"
              checked={Boolean(node.props[field.key])}
              onChange={(e) =>
                execute({
                  type: 'updateProps',
                  nodeId: node.id,
                  props: { [field.key]: e.target.checked },
                })
              }
            />
          ) : field.kind === 'select' ? (
            <select
              value={String(node.props[field.key] ?? '')}
              onChange={(e) =>
                execute({
                  type: 'updateProps',
                  nodeId: node.id,
                  props: { [field.key]: e.target.value },
                })
              }
            >
              {field.options?.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.kind === 'color' ? 'color' : 'text'}
              value={String(node.props[field.key] ?? '')}
              onChange={(e) =>
                execute({
                  type: 'updateProps',
                  nodeId: node.id,
                  props: { [field.key]: e.target.value },
                })
              }
            />
          )}
        </label>
      ))}
      <StyleFields node={node} />
      {node.type !== 'Page' && <ActionFields node={node} />}
    </div>
  )
}
function ActionFields({ node }: { node: ComponentNode }) {
  const execute = useEditorStore((s) => s.execute)
  const pages = useEditorStore((s) => s.project.pages)
  const kind = node.action?.type ?? ''
  const setKind = (value: string) => {
    if (!value) execute({ type: 'updateAction', nodeId: node.id, action: undefined })
    else if (value === 'navigate')
      execute({
        type: 'updateAction',
        nodeId: node.id,
        action: { type: 'navigate', pageId: pages[0]!.id },
      })
    else if (value === 'submit')
      execute({
        type: 'updateAction',
        nodeId: node.id,
        action: { type: 'submit', formId: node.id },
      })
    else execute({ type: 'updateAction', nodeId: node.id, action: { type: 'back' } })
  }
  return (
    <>
      <h3>点击动作</h3>
      <label>
        动作
        <select value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="">无</option>
          <option value="navigate">页面跳转</option>
          <option value="back">返回</option>
          <option value="submit">提交表单</option>
        </select>
      </label>
      {node.action?.type === 'navigate' && (
        <label>
          目标页面
          <select
            value={node.action.pageId}
            onChange={(event) =>
              execute({
                type: 'updateAction',
                nodeId: node.id,
                action: { type: 'navigate', pageId: event.target.value },
              })
            }
          >
            {pages.map((page) => (
              <option value={page.id} key={page.id}>
                {page.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  )
}
function ThemePanel() {
  const theme = useEditorStore((s) => s.project.theme)
  const updateTheme = useEditorStore((s) => s.updateTheme)
  return (
    <div className="properties">
      <PanelTitle title="主题" />
      {(
        [
          ['primaryColor', '主色'],
          ['backgroundColor', '背景色'],
          ['textColor', '文字色'],
        ] as const
      ).map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            type="color"
            value={theme[key]}
            onChange={(e) => updateTheme({ [key]: e.target.value })}
          />
        </label>
      ))}
      <label>
        全局圆角
        <select
          value={theme.radius}
          onChange={(e) => updateTheme({ radius: e.target.value as typeof theme.radius })}
        >
          {['none', 'sm', 'md', 'lg'].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
    </div>
  )
}
function StyleFields({ node }: { node: ComponentNode }) {
  const execute = useEditorStore((s) => s.execute)
  const style = node.style ?? {}
  const set = (key: string, value: string) =>
    execute({
      type: 'updateStyle',
      nodeId: node.id,
      style: { ...style, [key]: value || undefined },
    })
  return (
    <>
      <h3>外观</h3>
      <label>
        文字颜色
        <input
          type="color"
          value={style.color ?? '#172033'}
          onChange={(e) => set('color', e.target.value)}
        />
      </label>
      <label>
        背景颜色
        <input
          type="color"
          value={style.backgroundColor ?? '#ffffff'}
          onChange={(e) => set('backgroundColor', e.target.value)}
        />
      </label>
      <label>
        间距
        <select value={style.spacing ?? ''} onChange={(e) => set('spacing', e.target.value)}>
          <option value="">默认</option>
          {['none', 'xs', 'sm', 'md', 'lg', 'xl'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        圆角
        <select value={style.radius ?? ''} onChange={(e) => set('radius', e.target.value)}>
          <option value="">默认</option>
          {['none', 'sm', 'md', 'lg', 'pill'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        字号
        <select value={style.fontSize ?? ''} onChange={(e) => set('fontSize', e.target.value)}>
          <option value="">默认</option>
          {['xs', 'sm', 'md', 'lg', 'xl'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        对齐
        <select value={style.align ?? ''} onChange={(e) => set('align', e.target.value)}>
          <option value="">默认</option>
          {['start', 'center', 'end', 'stretch'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        子项间距
        <select value={style.gap ?? ''} onChange={(e) => set('gap', e.target.value)}>
          <option value="">默认</option>
          {['none', 'xs', 'sm', 'md', 'lg'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      {node.type === 'Grid' && (
        <label>
          列数
          <select
            value={style.columns ?? 2}
            onChange={(e) =>
              execute({
                type: 'updateStyle',
                nodeId: node.id,
                style: { ...style, columns: Number(e.target.value) as 1 | 2 | 3 | 4 },
              })
            }
          >
            {[1, 2, 3, 4].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      )}
    </>
  )
}
function PreviewPanel() {
  const frame = useRef<HTMLIFrameElement>(null)
  const project = useEditorStore((s) => s.project)
  const pageId = useEditorStore((s) => s.pageId)
  const [device, setDevice] = useState<'390' | '375' | '414'>('390')
  const [reload, setReload] = useState(0)
  const [error, setError] = useState('')
  const source = import.meta.env.VITE_RUNTIME_PREVIEW_URL ?? '/runtime/'
  const targetOrigin = new URL(source, location.href).origin
  const send = () =>
    frame.current?.contentWindow?.postMessage(createPreviewUpdate(project, pageId), targetOrigin)
  useEffect(() => {
    const timer = setTimeout(send, 180)
    return () => clearTimeout(timer)
  }, [project, pageId, reload])
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== targetOrigin) return
      const parsed = previewMessage.safeParse(event.data)
      if (!parsed.success) return
      if (parsed.data.type === 'preview:error') setError(parsed.data.message)
      if (parsed.data.type === 'preview:ready') {
        setError('')
        send()
      }
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [targetOrigin, project, pageId])
  return (
    <>
      <PanelTitle title="H5 即时预览" />
      <div className="preview-controls">
        <select value={device} onChange={(event) => setDevice(event.target.value as typeof device)}>
          <option value="375">iPhone SE</option>
          <option value="390">iPhone 15</option>
          <option value="414">大屏手机</option>
        </select>
        <button onClick={() => setReload((value) => value + 1)}>重新加载</button>
      </div>
      <iframe
        key={reload}
        ref={frame}
        title="H5 preview"
        className="preview-frame"
        style={{ width: Number(device) }}
        src={source}
        onLoad={send}
        sandbox="allow-scripts allow-same-origin"
      />
      {error && <div className="preview-error">{error}</div>}
    </>
  )
}
function WebNode({
  node,
  selectedId,
  onSelect,
}: {
  node: ComponentNode
  selectedId?: string
  onSelect: (id: string) => void
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: node.id })
  const draggable = useDraggable({
    id: `node:${node.id}`,
    data: { nodeId: node.id },
    disabled: node.type === 'Page',
  })
  const setRef = (element: HTMLElement | null) => {
    setDropRef(element)
    draggable.setNodeRef(element)
  }
  const style = webStyle(node)
  const content = node.children.map((child) => (
    <WebNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} />
  ))
  const common = {
    ref: setRef,
    className: `web-node type-${node.type.toLowerCase()} ${selectedId === node.id ? 'selected' : ''} ${isOver ? 'drop-target' : ''} ${draggable.isDragging ? 'dragging' : ''}`,
    style,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation()
      onSelect(node.id)
    },
    ...draggable.listeners,
    ...draggable.attributes,
  }
  if (node.type === 'Text') return <span {...common}>{String(node.props.text ?? '')}</span>
  if (node.type === 'Image')
    return <img {...common} src={String(node.props.src ?? '')} alt={String(node.props.alt ?? '')} />
  if (node.type === 'Button')
    return <button {...common}>{String(node.props.text ?? '按钮')}</button>
  if (node.type === 'Input')
    return (
      <label {...common}>
        {String(node.props.label ?? '')}
        <input placeholder={String(node.props.placeholder ?? '')} />
      </label>
    )
  if (node.type === 'Divider') return <hr {...common} />
  return (
    <div {...common}>
      {content.length ? (
        content
      ) : componentRegistry[node.type].container && node.type !== 'Page' ? (
        <span className="drop-hint">拖入组件</span>
      ) : null}
    </div>
  )
}
function webStyle(node: ComponentNode): CSSProperties {
  const s = node.style ?? {}
  const size = { none: 0, xs: 4, sm: 8, md: 16, lg: 24, xl: 36 }
  const radius = { none: 0, sm: 4, md: 10, lg: 18, pill: 999 }
  return {
    color: s.color,
    backgroundColor: s.backgroundColor,
    padding: s.spacing ? size[s.spacing] : undefined,
    borderRadius: s.radius ? radius[s.radius] : undefined,
    gap: s.gap ? size[s.gap] : undefined,
    display: node.type === 'Grid' ? 'grid' : node.type === 'Flex' ? 'flex' : undefined,
    gridTemplateColumns: s.columns ? `repeat(${s.columns}, 1fr)` : undefined,
    flexDirection: node.props.direction === 'column' ? 'column' : undefined,
  }
}
