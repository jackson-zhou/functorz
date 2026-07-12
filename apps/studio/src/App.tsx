import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { componentRegistry } from '@functorz/component-registry'
import { findNode } from '@functorz/editor-core'
import { serializeProject, type ComponentNode, type ComponentType, type ProjectSchema } from '@functorz/schema'
import { demoProject, ecommercePage, petManagementPage } from '@functorz/schema/fixtures'
import {
  FallbackProjectRepository,
  IndexedDbProjectRepository,
  MemoryProjectRepository,
  scheduleAutoSave,
} from './repository'
import { importProjectJson, selectCurrentPage, selectSelectedNode, useEditorStore } from './store'
import { CloudClient, type BuildJob } from './cloud'
import FlowEditorModal from './components/FlowEditorModal'
import type { Flow } from '@functorz/schema'
export const PRODUCT_NAME = 'Functorz Studio'
const repository =
  typeof indexedDB === 'undefined'
    ? undefined
    : new FallbackProjectRepository(
        new IndexedDbProjectRepository(),
        new MemoryProjectRepository(),
      )
const cloud = typeof sessionStorage === 'undefined' ? undefined : new CloudClient()

function migrateBundledPages(project: ProjectSchema): ProjectSchema {
  const legacyTypes = new Set<ComponentType>(['AppHeader', 'PetCard', 'BottomNav'])
  const containsLegacy = (node: ComponentNode): boolean =>
    legacyTypes.has(node.type) || node.children.some(containsLegacy)
  const containsText = (node: ComponentNode, text: string): boolean =>
    (node.type === 'Text' && node.props.text === text) || node.children.some((child) => containsText(child, text))
  const containsImageSource = (node: ComponentNode, prefix: string): boolean =>
    ((node.type === 'Image' && String(node.props.src ?? '').startsWith(prefix)) ||
      (node.type === 'ProductCard' && String(node.props.image ?? '').startsWith(prefix))) ||
    node.children.some((child) => containsImageSource(child, prefix))
  const containsType = (node: ComponentNode, type: ComponentType): boolean =>
    node.type === type || node.children.some((child) => containsType(child, type))
  const pageIndex = project.pages.findIndex((page) => page.id === petManagementPage.id)
  const commerceIndex = project.pages.findIndex((page) => page.id === ecommercePage.id)
  const replacePetPage = pageIndex >= 0 && containsLegacy(project.pages[pageIndex]!.root)
  const replaceCommercePage = commerceIndex >= 0 && (
    containsText(project.pages[commerceIndex]!.root, '更多 ➜') ||
    containsImageSource(project.pages[commerceIndex]!.root, 'https://picsum.photos/') ||
    (containsText(project.pages[commerceIndex]!.root, '猜你喜欢') && !containsType(project.pages[commerceIndex]!.root, 'KingKongList'))
  )
  if (!replacePetPage && !replaceCommercePage) return project
  const migrated = structuredClone(project)
  if (replacePetPage) migrated.pages[pageIndex] = structuredClone(petManagementPage)
  if (replaceCommercePage) migrated.pages[commerceIndex] = structuredClone(ecommercePage)
  return migrated
}

function PageItem({ item, active, deletable, onSelect, onDelete, onRename }: {
  item: { id: string; name: string; route: string }
  active: boolean
  deletable: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(item.name)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  useEffect(() => { setValue(item.name) }, [item.name])
  const commit = () => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== item.name) onRename(trimmed)
    else setValue(item.name)
    setEditing(false)
  }
  return (
    <button
      className={`page-item ${active ? 'active' : ''}`}
      onClick={onSelect}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
    >
      {editing ? (
        <input
          ref={inputRef}
          className="page-name-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setValue(item.name); setEditing(false) } }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span>{item.name}</span>
      )}
      <small>{item.route}</small>
      {deletable && (
        <span
          className="page-delete"
          onClick={(e) => { e.stopPropagation(); if (confirm(`确定要删除页面"${item.name}"吗？`)) onDelete() }}
          title="删除页面"
        >
          ×
        </span>
      )}
    </button>
  )
}

export function App() {
  const state = useEditorStore()
  const page = useEditorStore(selectCurrentPage)
  const selected = useEditorStore(selectSelectedNode)
  const [notice, setNotice] = useState('')
  const [rightTab, setRightTab] = useState<'page' | 'properties' | 'events'>('page')
  const [flowEventType, setFlowEventType] = useState<'tap' | 'load' | 'show' | 'scroll'>('tap')
  const [flowEditorOpen, setFlowEditorOpen] = useState(false)
  const [dragPreview, setDragPreview] = useState<{ label: string; kind: 'new' | 'move' }>()
  const [build, setBuild] = useState<BuildJob>()
  const [building, setBuilding] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const save = useMemo(() => (repository ? scheduleAutoSave(repository) : undefined), [])
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )
  useEffect(() => {
    setFlowEventType(selected?.type === 'Page' ? 'load' : 'tap')
  }, [selected?.id, selected?.type])
  const insertComponent = (componentType: ComponentType, targetId: string) => {
    const target = findNode(useEditorStore.getState().project, targetId)
    if (!target) return
    const targetIsContainer = componentRegistry[target.node.type].container
    const parentId = targetIsContainer ? target.node.id : target.parent?.id
    const index = targetIsContainer ? target.node.children.length : target.index
    if (!parentId) return
    useEditorStore.getState().execute({ type: 'insert', pageId: page.id, parentId, index, componentType })
    setNotice('组件已添加')
  }
  const onDragStart = ({ active }: DragStartEvent) => {
    const componentType = active.data.current?.componentType as ComponentType | undefined
    if (componentType) {
      setDragPreview({ label: componentRegistry[componentType].label, kind: 'new' })
      return
    }
    const nodeId = active.data.current?.nodeId as string | undefined
    const node = nodeId ? findNode(state.project, nodeId)?.node : undefined
    if (node) setDragPreview({ label: componentRegistry[node.type].label, kind: 'move' })
  }
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragPreview(undefined)
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
        insertComponent(componentType, String(over.id))
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
          const migrated = migrateBundledPages(record.project)
          useEditorStore.getState().replace(migrated, migrated !== record.project)
          setNotice(migrated === record.project ? '已恢复本地草稿' : '默认模板已升级')
        }
      },
      () => active && setNotice('本地数据库不可用，将仅保留当前会话数据'),
    )
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    const removeSelected = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (
        target?.matches('input, textarea, select') ||
        target?.isContentEditable ||
        target?.closest('[contenteditable="true"]')
      ) return
      const current = useEditorStore.getState()
      if (!current.selectedId) return
      const location = findNode(current.project, current.selectedId)
      if (!location?.parent) return
      event.preventDefault()
      current.execute({ type: 'remove', nodeId: current.selectedId })
      current.select(undefined)
      setNotice('组件已删除')
    }
    window.addEventListener('keydown', removeSelected)
    return () => window.removeEventListener('keydown', removeSelected)
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
  const publish = async () => {
    if (!cloud) return
    try {
      await cloud.login('developer@functorz.local')
      const result = await cloud.sync(useEditorStore.getState().project)
      setNotice(`发布成功（版本 ${result.version}）`)
    } catch (error) {
      setNotice(
        error instanceof Error && error.message === 'VERSION_CONFLICT'
          ? '发布冲突，请刷新后重试'
          : '发布失败',
      )
    }
  }
  const previewMiniapp = async () => {
    if (!cloud || building) return
    setBuilding(true)
    setBuild({ id: '', projectId: '', status: 'queued', createdAt: new Date().toISOString() })
    try {
      await cloud.login('developer@functorz.local')
      await cloud.sync(useEditorStore.getState().project)
      const job = await cloud.createBuild(useEditorStore.getState().project.id)
      setBuild(job)
      const terminal = new Set(['success', 'failed', 'cancelled'])
      let current = job
      while (!terminal.has(current.status)) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        current = await cloud.getBuild(job.id)
        setBuild(current)
      }
    } catch (error) {
      setBuild({
        id: '',
        projectId: '',
        status: 'failed',
        createdAt: new Date().toISOString(),
        error: { stage: 'queued', message: error instanceof Error ? error.message : '构建失败' },
      })
    } finally {
      setBuilding(false)
    }
  }
  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragCancel={() => setDragPreview(undefined)}
      onDragEnd={onDragEnd}
    >
      <div className="studio">
        <header className="toolbar">
          <div className="brand">
            <span className="brand-mark">F</span>
            <strong>{PRODUCT_NAME}</strong>
            <a href="/lowcode-proposal.html" target="_blank" className="badge version-badge" title="查看低代码平台迁移方案">V1</a>
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
            <button onClick={() => { useEditorStore.getState().replace(demoProject); setNotice('已重置为初始项目') }}>重置</button>
            <button className="publish-button" disabled onClick={() => void publish()}>发布</button>
            <button
              className="preview-miniapp-button"
              disabled
              onClick={() => void previewMiniapp()}
            >
              小程序预览
            </button>
            <span className={`save ${state.saveState}`} title={state.saveState === 'error' ? '本地保存失败，数据仍保留在当前会话中' : undefined}>
              {state.saveState === 'saved'
                ? '已保存'
                : state.saveState === 'saving'
                  ? '保存中…'
                  : state.saveState === 'error'
                    ? '保存失败'
                    : '本地保存'}
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
          <div className="panel-header">
            <PanelTitle title="页面" />
            <button
              className="btn-icon"
              onClick={() => {
                const name = prompt('页面名称：')
                if (!name) return
                const route = prompt('路由路径（如 /about）：', `/${name.toLowerCase().replace(/\s+/g, '-')}`)
                if (route === null) return
                state.addPage(name, route || `/${name}`)
                setNotice('页面已添加')
              }}
              title="添加页面"
              aria-label="添加页面"
            >
              +
            </button>
          </div>
          <div className="page-list">
            {state.project.pages.map((item) => (
              <PageItem
                key={item.id}
                item={item}
                active={item.id === page.id}
                deletable={state.project.pages.length > 1}
                onSelect={() => state.setPage(item.id)}
                onDelete={() => { state.removePage(item.id); setNotice('页面已删除') }}
                onRename={(name) => state.renamePage(item.id, name)}
              />
            ))}
          </div>
          <PanelTitle title="组件" />
          <div className="component-grid">
            {Object.values(componentRegistry)
              .filter((item) => item.type !== 'Page' && !item.deprecated)
              .map((item) => (
                <PaletteItem key={item.type} type={item.type} label={item.label} active={selected?.type === item.type} />
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
            <WebNode
              node={page.root}
              selectedId={state.selectedId}
              onSelect={state.select}
              onInsert={insertComponent}
            />
          </div>
          {notice && <div className="toast">{notice}</div>}
        </main>
        <aside className="right-panel">
          <div className="right-tabs" role="tablist" aria-label="右侧编辑区">
            <button role="tab" aria-selected={rightTab === 'page'} className={rightTab === 'page' ? 'active' : ''} onClick={() => setRightTab('page')}>页面</button>
            <button role="tab" aria-selected={rightTab === 'properties'} className={rightTab === 'properties' ? 'active' : ''} onClick={() => setRightTab('properties')}>属性</button>
            <button role="tab" aria-selected={rightTab === 'events'} className={rightTab === 'events' ? 'active' : ''} onClick={() => setRightTab('events')}>交互</button>
          </div>
          {rightTab === 'page' ? (
            <div className="right-tab-content" role="tabpanel">
              <PanelTitle title="组件树" />
              <NodeTree node={page.root} />
            </div>
          ) : rightTab === 'properties' ? (
            <div className="right-tab-content" role="tabpanel">
              {selected ? <PropertyPanel node={selected} /> : <div className="empty">选择画布中的组件进行编辑</div>}
              <ThemePanel />
            </div>
          ) : (
            <div className="right-tab-content" role="tabpanel">
              {selected ? (
                <div>
                  <PanelTitle title="事件配置" />
                  <div style={{ padding: '0 16px 16px' }}>
                    <div className="event-table">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: '80px' }}>事件类型</th>
                            <th style={{ width: '140px' }}>说明</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selected.type === 'Page' ? [
                            { type: 'load' as const, label: '进入', desc: 'onLoad' },
                            { type: 'show' as const, label: '显示', desc: 'onShow' },
                          ] : [
                            { type: 'tap' as const, label: '点击', desc: 'tap' },
                            { type: 'scroll' as const, label: '滚动加载', desc: 'scroll' },
                          ]).map(({ type, label, desc }) => {
                            const bound = selected.events?.[type]
                            return (
                              <tr key={type} className={bound ? 'bound' : ''}>
                                <td>
                                  <strong>{label}</strong>
                                  <div style={{ fontSize: '11px', color: '#999', fontWeight: 'normal' }}>{desc}</div>
                                </td>
                                <td style={{ color: '#666' }}>
                                  {type === 'load' ? '页面加载时触发' : type === 'show' ? '页面显示时触发' : type === 'tap' ? '用户点击时触发' : '滚动到底部时触发'}
                                </td>
                                <td style={{ position: 'relative' }}>
                                  {bound ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <button
                                        className="btn btn-primary"
                                        style={{ fontSize: '11px', padding: '4px 8px' }}
                                        onClick={() => {
                                          setFlowEventType(type)
                                          setFlowEditorOpen(true)
                                        }}
                                      >
                                        编辑
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      className="btn btn-primary"
                                      style={{ fontSize: '11px', padding: '4px 8px' }}
                                      onClick={() => {
                                        setFlowEventType(type)
                                        setFlowEditorOpen(true)
                                      }}
                                    >
                                      绑定
                                    </button>
                                  )}
                                  {bound && (
                                    <button
                                      className="btn-clear-event"
                                      title="清除绑定"
                                      onClick={() => {
                                        state.execute({ type: 'updateEvents', nodeId: selected.id, events: { ...selected.events, [type]: undefined } })
                                        setNotice('事件绑定已清除')
                                      }}
                                    >
                                      ×
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e8e8e8' }}>
                      提示：选择不同组件可查看对应可绑定的事件类型
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty">选择画布中的组件进行编辑</div>
              )}
            </div>
          )}
        </aside>
        {selected && (
          <FlowEditorModal
            open={flowEditorOpen}
            initialFlow={selected.events?.[flowEventType]}
            onSave={(flow: Flow) => {
              state.execute({ type: 'updateEvents', nodeId: selected.id, events: { ...selected.events, [flowEventType]: flow } })
              setFlowEditorOpen(false)
              setNotice('事件流程已保存')
            }}
            onClose={() => setFlowEditorOpen(false)}
          />
        )}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
        {dragPreview ? (
          <div className={`drag-overlay ${dragPreview.kind}`}>
            <span>{dragPreview.label.slice(0, 1)}</span>
            <strong>{dragPreview.label}</strong>
            <small>{dragPreview.kind === 'new' ? '拖入画布' : '调整层级'}</small>
          </div>
        ) : null}
      </DragOverlay>
      {build && (
        <MiniappPreviewModal job={build} busy={building} onClose={() => setBuild(undefined)} />
      )}
    </DndContext>
  )
}
const BUILD_STAGE_LABEL: Record<BuildJob['status'], string> = {
  queued: '排队中…',
  generating: '生成小程序代码…',
  building: '编译小程序…',
  uploading: '上传并生成二维码…',
  success: '构建成功',
  failed: '构建失败',
  cancelled: '已取消',
}
function MiniappPreviewModal({
  job,
  busy,
  onClose,
}: {
  job: BuildJob
  busy: boolean
  onClose: () => void
}) {
  return (
    <div className="miniapp-modal-backdrop" onClick={onClose}>
      <div className="miniapp-modal" onClick={(event) => event.stopPropagation()}>
        <div className="miniapp-modal-head">
          <strong>小程序预览</strong>
          <button className="miniapp-modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="miniapp-modal-body">
          {job.status === 'success' && job.qrCode ? (
            <>
              <img className="miniapp-qr" src={job.qrCode} alt="小程序预览二维码" />
              <p className="miniapp-hint">用微信扫码预览（需为体验成员）</p>
            </>
          ) : job.status === 'failed' ? (
            <p className="miniapp-error">
              {job.error ? `${job.error.message}` : '构建失败'}
            </p>
          ) : (
            <>
              {busy && <div className="miniapp-spinner" aria-hidden />}
              <p className="miniapp-stage">{BUILD_STAGE_LABEL[job.status]}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
function PaletteItem({ type, label, active }: { type: ComponentType; label: string; active: boolean }) {
  const [isDragging, setIsDragging] = useState(false)
  return (
    <div
      draggable
      className={`component-item ${active ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
      aria-current={active ? 'true' : undefined}
      title={`拖动“${label}”到画布`}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'copy'
        event.dataTransfer.setData('application/x-functorz-component', type)
        event.dataTransfer.setData('text/plain', type)
        setIsDragging(true)
      }}
      onDragEnd={() => setIsDragging(false)}
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
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: node.id })
  const draggable = useDraggable({
    id: `node:${node.id}`,
    data: { nodeId: node.id },
    disabled: node.type === 'Page',
  })
  const setRef = (element: HTMLButtonElement | null) => {
    setDropRef(element)
    draggable.setNodeRef(element)
  }
  return (
    <div>
      <button
        ref={setRef}
        className={`tree-node ${selectedId === node.id ? 'active' : ''} ${isOver ? 'drop-target' : ''} ${draggable.isDragging ? 'dragging' : ''}`}
        style={{ paddingLeft: 12 + depth * 14 }}
        onClick={() => useEditorStore.getState().select(node.id)}
        {...draggable.listeners}
        {...draggable.attributes}
      >
        <span className="tree-node-label">{componentRegistry[node.type].label}</span>
        <small>{String(node.props.text ?? node.props.label ?? '')}</small>
      </button>
      {node.children.map((child) => (
        <NodeTree node={child} depth={depth + 1} key={child.id} />
      ))}
    </div>
  )
}
function PropertyPanel({ node }: { node: ComponentNode }) {
  const execute = useEditorStore((s) => s.execute)
  const definition = componentRegistry[node.type]
  const inlineFields = definition.properties.filter(
    (f) => !definition.itemSchema || f.key !== 'items',
  )
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
      {inlineFields.map((field) => (
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
          ) : field.kind === 'number' ? (
            <input
              type="number"
              value={String(node.props[field.key] ?? '')}
              onChange={(e) =>
                execute({
                  type: 'updateProps',
                  nodeId: node.id,
                  props: { [field.key]: e.target.value === '' ? undefined : Number(e.target.value) },
                })
              }
            />
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
      {definition.itemSchema && <ItemsEditor node={node} />}
    </div>
  )
}
function ItemsEditor({ node }: { node: ComponentNode }) {
  const execute = useEditorStore((s) => s.execute)
  const definition = componentRegistry[node.type]
  if (!definition.itemSchema) return null
  const items: Record<string, unknown>[] = (() => {
    try {
      const parsed = JSON.parse(String(node.props.items ?? '[]'))
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  })()
  const MAX_ITEMS = 20
  const commit = (newItems: Record<string, unknown>[]) => {
    execute({
      type: 'updateProps',
      nodeId: node.id,
      props: { items: newItems.length ? JSON.stringify(newItems) : '[]' },
    })
  }
  const updateItem = (index: number, field: string, value: string) => {
    const newItems = items.slice()
    while (newItems.length <= index) newItems.push({})
    newItems[index] = { ...newItems[index], [field]: value || undefined }
    commit(newItems)
  }
  const addItem = () => {
    if (items.length >= MAX_ITEMS) return
    commit([...items, {}])
  }
  const removeItem = (index: number) => {
    const newItems = items.slice()
    newItems.splice(index, 1)
    commit(newItems)
  }
  return (
    <div className="items-editor">
      <h3>占位数据</h3>
      {items.map((item, i) => (
        <div key={i} className="item-slot">
          <span className="item-index">#{i + 1}</span>
          <div className="item-fields">
            {definition.itemSchema!.map((field) => (
              <label key={field.key}>
                {field.label}
                {field.kind === 'color' ? (
                  <input
                    type="color"
                    value={String(item[field.key] ?? '#ff5000')}
                    onChange={(e) => updateItem(i, field.key, e.target.value)}
                  />
                ) : (
                  <input
                    type="text"
                    value={String(item[field.key] ?? '')}
                    onChange={(e) => updateItem(i, field.key, e.target.value)}
                    placeholder={field.label}
                  />
                )}
              </label>
            ))}
          </div>
          <button className="item-remove" onClick={() => removeItem(i)} title="删除此项">
            ×
          </button>
        </div>
      ))}
      {items.length < MAX_ITEMS && (
        <button className="item-add" onClick={addItem}>
          + 添加一项
        </button>
      )}
    </div>
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
    execute({ type: 'updateStyle', nodeId: node.id, style: { ...style, [key]: value || undefined } })
  const setNumber = (key: string, value: string) =>
    execute({ type: 'updateStyle', nodeId: node.id, style: { ...style, [key]: value === '' ? undefined : Number(value) } })

  const fields: { type: 'color' | 'number' | 'select'; key: string; label: string; options?: string[] }[] = []

  // 尺寸（所有组件都可用）
  fields.push({ type: 'number', key: 'width', label: '宽度' })
  fields.push({ type: 'number', key: 'height', label: '高度' })
  fields.push({ type: 'number', key: 'flex', label: '伸缩比例' })

  const isText = ['Text', 'Button', 'Badge', 'Tag', 'Input'].includes(node.type)
  const isContainer = ['Page', 'Section', 'Flex', 'Grid', 'Card', 'Form', 'Swiper', 'Tabs'].includes(node.type)
  const isImage = node.type === 'Image'
  const isDivider = node.type === 'Divider'
  const isSpacer = node.type === 'Spacer'

  // 排版相关
  if (isText || ['Countdown', 'AppHeader', 'FAB'].includes(node.type)) {
    fields.push({ type: 'color', key: 'color', label: '文字颜色' })
    fields.push({ type: 'select', key: 'fontSize', label: '字号', options: ['xs', 'sm', 'md', 'lg', 'xl'] })
    fields.push({ type: 'select', key: 'fontWeight', label: '字重', options: ['normal', 'medium', 'semibold', 'bold'] })
  }
  if (isText) {
    fields.push({ type: 'select', key: 'textAlign', label: '文本对齐', options: ['left', 'center', 'right'] })
  }

  // 背景
  if (!isDivider && !isSpacer && !isImage) {
    fields.push({ type: 'color', key: 'backgroundColor', label: '背景颜色' })
  }

  // 间距/圆角
  if (isContainer || ['Button', 'Badge', 'Tag', 'Input', 'SearchBar', 'Countdown', 'KingKongList', 'ProductList'].includes(node.type)) {
    fields.push({ type: 'select', key: 'spacing', label: '间距', options: ['none', 'xs', 'sm', 'md', 'lg', 'xl'] })
  }
  if (!isSpacer && !isDivider) {
    fields.push({ type: 'select', key: 'radius', label: '圆角', options: ['none', 'sm', 'md', 'lg', 'pill'] })
  }

  // 子项间距
  if (isContainer || ['KingKongList', 'ProductList'].includes(node.type)) {
    fields.push({ type: 'select', key: 'gap', label: '子项间距', options: ['none', 'xs', 'sm', 'md', 'lg'] })
  }

  // 图片适配
  if (isImage) {
    fields.push({ type: 'select', key: 'objectFit', label: '图片适配', options: ['cover', 'contain', 'fill'] })
  }

  // 边框
  if (!isSpacer && !isText) {
    fields.push({ type: 'number', key: 'borderWidth', label: '边框宽度' })
    fields.push({ type: 'color', key: 'borderColor', label: '边框颜色' })
  }

  // 分隔线颜色
  if (isDivider) {
    fields.push({ type: 'color', key: 'color', label: '线条颜色' })
  }

  // Grid 列数
  if (node.type === 'Grid') {
    fields.push({ type: 'select', key: 'columns', label: '列数', options: ['1', '2', '3', '4'] })
  }

  return (
    <>
      <h3>外观</h3>
      {fields.map(({ type, key, label, options }) => (
        <label key={key}>
          {label}
          {type === 'color' ? (
            <input type="color" value={(style as any)[key] ?? '#000000'} onChange={(e) => set(key, e.target.value)} />
          ) : type === 'number' ? (
            <input type="number" value={(style as any)[key] ?? ''} onChange={(e) => setNumber(key, e.target.value)} />
          ) : key === 'columns' ? (
            <select value={(style as any).columns ?? 2} onChange={(e) => execute({ type: 'updateStyle', nodeId: node.id, style: { ...style, columns: Number(e.target.value) as 1 | 2 | 3 | 4 } })}>
              {options!.map((v) => <option key={v}>{v}</option>)}
            </select>
          ) : (
            <select value={(style as any)[key] ?? ''} onChange={(e) => set(key, e.target.value)}>
              <option value="">默认</option>
              {options!.map((v) => <option key={v}>{v}</option>)}
            </select>
          )}
        </label>
      ))}
    </>
  )
}
function nodeListItems(node: ComponentNode): Record<string, unknown>[] {
  try {
    const items = JSON.parse(String(node.props.items ?? '[]'))
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}
function WebNode({
  node,
  selectedId,
  onSelect,
  onInsert,
}: {
  node: ComponentNode
  selectedId?: string
  onSelect: (id: string) => void
  onInsert: (type: ComponentType, targetId: string) => void
}) {
  const [nativeDragOver, setNativeDragOver] = useState(false)
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
    <WebNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} onInsert={onInsert} />
  ))
  const common = {
    ref: setRef,
    className: `web-node type-${node.type.toLowerCase()} ${selectedId === node.id ? 'selected' : ''} ${isOver || nativeDragOver ? 'drop-target' : ''} ${draggable.isDragging ? 'dragging' : ''}`,
    style,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation()
      onSelect(node.id)
    },
    onDragOver: (event: React.DragEvent) => {
      if (event.dataTransfer.types.includes('application/x-functorz-component')) {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
        setNativeDragOver(true)
      }
    },
    onDragLeave: (event: React.DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setNativeDragOver(false)
    },
    onDrop: (event: React.DragEvent) => {
      const type = event.dataTransfer.getData('application/x-functorz-component') as ComponentType
      if (!type || !componentRegistry[type]) return
      event.preventDefault()
      event.stopPropagation()
      setNativeDragOver(false)
      onInsert(type, node.id)
    },
    ...draggable.listeners,
    ...draggable.attributes,
  }
  if (node.type === 'Text') return <span {...common}>{String(node.props.text ?? '')}</span>
  if (node.type === 'Image')
    return <img {...common} src={String(node.props.src ?? '')} alt={String(node.props.alt ?? '')} />
  if (node.type === 'Button')
    return <button {...common} className={`${common.className} type-button-text variant-${String(node.props.variant ?? 'primary')}`}>{String(node.props.text ?? '按钮')}</button>
  if (node.type === 'Input')
    return (
      <label {...common}>
        {node.props.icon === 'search' && <span className="input-icon">⌕</span>}
        {String(node.props.label ?? '')}
        <input placeholder={String(node.props.placeholder ?? '')} />
      </label>
    )
  if (node.type === 'SearchBar')
    return (
      <div {...common} className={`${common.className} commerce-search`}>
        <span className="commerce-scan" aria-hidden="true">⌗</span>
        <span className="commerce-search-placeholder">{String(node.props.placeholder ?? '搜索商品')}</span>
        {Boolean(node.props.showButton) && (
          <span className="commerce-search-button">{String(node.props.buttonText ?? '搜索')}</span>
        )}
      </div>
    )
  if (node.type === 'ProductCard')
    return (
      <article {...common} className={`${common.className} commerce-product-card`}>
        <img src={String(node.props.image ?? '')} alt="" />
        <div className="commerce-product-copy">
          <strong>{String(node.props.name ?? '')}</strong>
          {Boolean(node.props.tag) && <span className="commerce-product-tag">{String(node.props.tag)}</span>}
          <div className="commerce-product-meta">
            <span><small>¥</small>{String(node.props.price ?? '')}</span>
            {Boolean(node.props.sales) && <em>已售 {String(node.props.sales)}</em>}
          </div>
        </div>
      </article>
    )
  if (node.type === 'KingKongList') {
    const items = nodeListItems(node)
    return (
      <div {...common} className={`${common.className} commerce-kingkong-list`} style={{ ...style, gridTemplateColumns: `repeat(${Number(node.props.columns ?? 5)}, minmax(0, 1fr))` }}>
        {items.map((item, index) => (
          <div className="commerce-kingkong-item" key={String(item.id ?? index)}>
            <span style={{ backgroundColor: String(item.color ?? '#ff5000') }}>{String(item.icon ?? '')}</span>
            <small>{String(item.label ?? '')}</small>
          </div>
        ))}
      </div>
    )
  }
  if (node.type === 'ProductList') {
    const items = nodeListItems(node)
    return (
      <div {...common} className={`${common.className} commerce-product-list`} style={{ ...style, gridTemplateColumns: `repeat(${Number(node.props.columns ?? 2)}, minmax(0, 1fr))` }}>
        {items.map((item, index) => (
          <article className="commerce-product-card" key={String(item.id ?? index)}>
            <img src={String(item.image ?? '')} alt="" />
            <div className="commerce-product-copy">
              <strong>{String(item.name ?? '')}</strong>
              {Boolean(item.tag) && <span className="commerce-product-tag">{String(item.tag)}</span>}
              <div className="commerce-product-meta"><span><small>¥</small>{String(item.price ?? '')}</span><em>{String(item.sales ?? '')}</em></div>
            </div>
          </article>
        ))}
      </div>
    )
  }
  if (node.type === 'Divider') return <hr {...common} />
  if (node.type === 'Tabs') {
    const items = String(node.props.items ?? '').split(',').map((item) => item.trim())
    const activeIndex = Number(node.props.activeIndex ?? 0)
    return (
      <div {...common} className={`${common.className} ${node.props.variant === 'commerce' ? 'commerce-tabs' : ''}`}>
        <div className="tabs-header">
          {items.map((item, index) => (
            <div key={item} className={`tab-item${index === activeIndex ? ' active' : ''}`}>{item}</div>
          ))}
        </div>
        <div className="tabs-content">{content}</div>
      </div>
    )
  }
  if (node.type === 'AppHeader')
    return (
      <div {...common} className={`${common.className} pet-app-header`}>
        <span className="pet-menu" aria-hidden="true"><i /><i /><i /></span>
        <strong>{String(node.props.title ?? '活体')}</strong>
        <span className="pet-capsule" aria-hidden="true"><b>•••</b><i /><em>—</em><i /><span>●</span></span>
      </div>
    )
  if (node.type === 'PetCard') {
    const gender = String(node.props.gender ?? 'female')
    const image = String(node.props.image ?? '')
    return (
      <article {...common} className={`${common.className} pet-card`}>
        <div className="pet-card-main">
          <div className="pet-photo-wrap">
            {image ? <img className="pet-photo" src={image} alt="" /> : <div className="pet-photo pet-photo-empty" />}
            <span className={`pet-gender ${gender}`}>{gender === 'male' ? '♂' : '♀'}</span>
          </div>
          <div className="pet-info">
            <div className="pet-title-row">
              <strong>{String(node.props.name ?? '')}</strong>
              {node.props.age ? <span className="pet-age">{String(node.props.age)}</span> : null}
            </div>
            <div className="pet-breed">{String(node.props.breed ?? '—')}</div>
            <div className="pet-meta"><span>{String(node.props.code ?? '—')}</span><span>{String(node.props.status ?? '—')}</span></div>
          </div>
        </div>
        <div className="pet-actions"><button type="button">登录</button><button type="button">复制</button><button type="button">修改</button></div>
      </article>
    )
  }
  if (node.type === 'FAB')
    return (
      <div {...common} className={`${common.className} type-fab`}>
        <div className="fab-circle">{node.props.icon === 'plus' ? '+' : String(node.props.icon ?? '+')}</div>
        {Boolean(node.props.label) && <div className="fab-label">{String(node.props.label)}</div>}
      </div>
    )
  if (node.type === 'BottomNav') {
    const activeIndex = Number(node.props.activeIndex ?? 0)
    const itemsValue = String(node.props.items ?? '')
    let items: string[]
    try {
      items = JSON.parse(itemsValue) as string[]
    } catch {
      items = itemsValue.split(',').map((item) => item.trim())
    }
    const icons: Record<string, string> = {
      首页: '淘', 逛逛: '✦', 消息: '▤', 购物车: '□', 我的淘宝: '⌣',
      活体: '♧', 添加: '+', 繁育: '♧', 我的: '⌣',
    }
    return (
      <nav {...common} className={`${common.className} pet-bottom-nav commerce-bottom-nav`}>
        {items.map((item, index) => (
          <button type="button" key={`${item}-${index}`} className={`${index === activeIndex ? 'active' : ''}${item === '添加' ? ' add' : ''}`}>
            <span>{icons[item] ?? '•'}</span>{item !== '添加' && <small>{item}</small>}
          </button>
        ))}
      </nav>
    )
  }
  if (node.type === 'Badge') return <span {...common} className={`${common.className} type-badge badge-${String(node.props.variant ?? 'default')}`}>{String(node.props.text ?? '')}</span>
  if (node.type === 'Tag') return <span {...common} className={`${common.className} type-tag tag-${String(node.props.variant ?? 'default')}`}>{String(node.props.text ?? '')}</span>
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
  const columns = (node.props.columns as number | undefined) ?? s.columns
  const size = { none: 0, xs: 4, sm: 8, md: 16, lg: 24, xl: 36 }
  const radius = { none: 0, sm: 4, md: 10, lg: 18, pill: 999 }
  return {
    color: s.color,
    backgroundColor: s.backgroundColor,
    padding: s.spacing ? size[s.spacing] : undefined,
    borderRadius: s.radius ? radius[s.radius] : undefined,
    gap: s.gap ? size[s.gap] : undefined,
    display: node.type === 'Grid' ? 'grid' : node.type === 'Flex' ? 'flex' : undefined,
    gridTemplateColumns: columns ? `repeat(${columns}, minmax(0, 1fr))` : undefined,
    flexDirection: node.props.direction === 'column' ? 'column' : undefined,
    justifyContent: node.props.justifyContent as CSSProperties['justifyContent'],
    alignItems: node.props.alignItems as CSSProperties['alignItems'],
    flexWrap: node.props.wrap as CSSProperties['flexWrap'],
    width: s.width,
    height: s.height,
    flex: s.flex,
    border: s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor ?? '#e5e7eb'}` : undefined,
    fontWeight: s.fontWeight === 'medium' ? 500 : s.fontWeight === 'semibold' ? 600 : s.fontWeight,
    textAlign: s.textAlign,
    objectFit: s.objectFit,
  }
}
