import { useEffect, useRef, useState } from 'react'
import { Edge, Graph, History, type Node } from '@antv/x6'
import type { Flow } from '@functorz/schema'
import FlowNodePalette from './FlowNodePalette'
import FlowPropertyPanel from './FlowPropertyPanel'
import './FlowEditor.css'

interface FlowEditorModalProps {
  open: boolean
  initialFlow?: Flow
  onSave: (flow: Flow) => void
  onClose: () => void
}

const ARROW_BLOCK = { name: 'block', width: 12, height: 8 }

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function getMarkerConfig(arrow: string) {
  switch (arrow) {
    case 'backward':
      return { targetMarker: null, sourceMarker: ARROW_BLOCK }
    case 'both':
      return { targetMarker: ARROW_BLOCK, sourceMarker: ARROW_BLOCK }
    case 'none':
      return { targetMarker: null, sourceMarker: null }
    default:
      return { targetMarker: ARROW_BLOCK, sourceMarker: null }
  }
}

export default function FlowEditorModal({ open, initialFlow, onSave, onClose }: FlowEditorModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const [selectedNode, setSelectedNode] = useState<{ id: string; type: string; label: string; config: Record<string, unknown> } | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<{ id: string; arrow: string; label: string } | null>(null)
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; label: string; color: string } | null>(null)
  const selectedNodeRef = useRef(selectedNode)
  const selectedEdgeRef = useRef(selectedEdge)
  selectedNodeRef.current = selectedNode
  selectedEdgeRef.current = selectedEdge

  // 把 getNodeStyle 移到这里，这样整个组件都能访问到
    const getNodeStyle = (type: string) => {
      const styles: Record<string, { shape?: string; color: string; width: number; height: number }> = {
        start: { shape: 'rect', color: '#52c41a', width: 60, height: 60 },
        end: { shape: 'rect', color: '#52c41a', width: 60, height: 60 },
        api: { shape: 'rect', color: '#1890ff', width: 120, height: 50 },
        alert: { shape: 'rect', color: '#faad14', width: 120, height: 50 },
        navigate: { shape: 'rect', color: '#13c2c2', width: 120, height: 50 },
        condition: { shape: 'polygon', color: '#722ed1', width: 160, height: 80 },
        setData: { shape: 'rect', color: '#fa8c16', width: 120, height: 50 },
      }
      return styles[type] || { color: '#999', width: 100, height: 50 }
    }

  // 根据节点类型构建 attrs（条件分支用 polygon 菱形，其余用 rect 圆角矩形）
  const buildNodeAttrs = (type: string, _color: string) => {
    if (type === 'condition') {
      return {
        body: {
          fill: '#fff',
          refPoints: '80,0 160,40 80,80 0,40',
          stroke: '#000',
          strokeWidth: 2,
        },
        label: {
          fill: '#000',
          fontSize: 14,
        },
      }
    }
    const isRound = type === 'start' || type === 'end'
    return {
      body: {
        fill: '#fff',
        rx: isRound ? 30 : 4,
        ry: isRound ? 30 : 4,
        stroke: '#000',
        strokeWidth: 2,
      },
      label: {
        fill: '#000',
        fontSize: 12,
      },
    }
  }

  // 节点端口配置 — 所有节点统一使用 4 个连接点（上/右/下/左）
  const getNodePorts = (_type: string) => {
    const portAttrs = {
      circle: {
        r: 2,
        magnet: true,
        stroke: '#31d0c6',
        strokeWidth: 1,
        fill: '#fff',
        opacity: 0,
      },
    }
    return {
      groups: {
        left: { position: 'left' as const, attrs: portAttrs },
        top: { position: 'top' as const, attrs: portAttrs },
        right: { position: 'right' as const, attrs: portAttrs },
        bottom: { position: 'bottom' as const, attrs: portAttrs },
      },
      items: [
        { id: 'left', group: 'left', attrs: portAttrs },
        { id: 'top', group: 'top', attrs: portAttrs },
        { id: 'right', group: 'right', attrs: portAttrs },
        { id: 'bottom', group: 'bottom', attrs: portAttrs },
      ],
    }
  }

  useEffect(() => {
    if (!open || !containerRef.current) return

    const graph = new Graph({
      container: containerRef.current,
      autoResize: true,
      grid: true,
      panning: {
        enabled: true,
        eventTypes: ['leftMouseDown'],
      },
      mousewheel: false,
      connecting: {
        snap: true,
        allowBlank: false,
        allowLoop: false,
        allowMulti: true,
        allowNode: false,
        allowPort: true,
        connector: { name: 'normal' },
        router: {
          name: 'normal',
        },
        anchor: 'center',
        connectionPoint: 'boundary',
        validateConnection({ sourceMagnet, targetMagnet }) {
          // 必须从端口连接到端口
          if (!sourceMagnet || !targetMagnet) return false
          return true
        },
        createEdge() {
          return new Edge({
            attrs: {
              line: {
                stroke: '#A2B1C3',
                strokeWidth: 2,
                targetMarker: {
                  name: 'block',
                  width: 12,
                  height: 8,
                },
                sourceMarker: null,
              },
            },
            zIndex: 10,
            vertices: [],
            data: { arrow: 'forward' },
          })
        },
      },
      highlighting: {
        magnetAdsorbed: {
          name: 'stroke',
          args: {
            attrs: {
              fill: '#31d0c6',
              stroke: '#31d0c6',
            },
          },
        },
      },
      interacting: {
        edgeLabelMovable: true,
        edgeMovable: false,
        vertexMovable: true,
        vertexAddable: true,
        vertexDeletable: true,
      },
    })

    graphRef.current = graph

    const history = new History({ enabled: true })
    graph.use(history)

    graph.on('node:click', ({ node }: { node: Node }) => {
      const data = node.getData()
      setSelectedNode({
        id: node.id,
        type: data.type,
        label: (node.getAttrByPath('text/text') as string) || data.type || '',
        config: data.config || {},
      })
      setSelectedEdge(null)
      showNodePorts(node)
    })

    // 双击连线添加顶点（弯折）
    graph.on('edge:dblclick', ({ edge, x, y }: { edge: Edge; x: number; y: number }) => {
      const vertices = edge.getVertices()
      const newVertex = { x, y }
      
      // 找到插入位置（距离最近的位置）
      let insertIndex = vertices.length
      for (let i = 0; i < vertices.length; i++) {
        const v = vertices[i]
        const dist = Math.sqrt(Math.pow(v.x - x, 2) + Math.pow(v.y - y, 2))
        if (dist < 30) {
          // 太近了，不添加
          return
        }
      }
      
      edge.insertVertex(newVertex, insertIndex)
    })

    graph.on('edge:click', ({ edge }: { edge: Edge }) => {
      // 拖动后不触发 click
      if (edgeWasDragged) {
        edgeWasDragged = false
        return
      }
      // 选中连线时取消选中节点
      setSelectedNode(null)
      hideAllPorts()
      // 先恢复其他连线样式和移除工具
      graph.getEdges().forEach((other: Edge) => {
        if (other.id !== edge.id) {
          other.attr('line/stroke', '#A2B1C3')
          other.attr('line/strokeWidth', 2)
          other.removeTools()
        }
      })
      // 高亮当前连线（单击仅选中，不加任何工具）
      edge.attr('line/stroke', '#1890ff')
      edge.attr('line/strokeWidth', 3)
      const edgeData = edge.getData() || {}
      const labelText = edge.getLabels()?.[0]?.attrs?.text?.text
      setSelectedEdge({
        id: edge.id,
        arrow: edgeData.arrow || 'forward',
        label: typeof labelText === 'string' ? labelText : '',
      })
    })

    // 自定义连线拖动：按住拖动可脱离两端节点
    let edgeDrag: { edge: Edge; startX: number; startY: number; lastX: number; lastY: number; detached: boolean } | null = null
    let edgeWasDragged = false

    graph.on('edge:mousedown', ({ edge, x, y }: { edge: Edge; x: number; y: number }) => {
      edgeDrag = { edge, startX: x, startY: y, lastX: x, lastY: y, detached: false }
    })

    const handleEdgeMouseMove = (e: MouseEvent) => {
      if (!edgeDrag) return
      const pt = graph.clientToGraph(e.clientX, e.clientY)
      if (!edgeDrag.detached) {
        // 移动超过阈值才算拖动（区分单击和拖动）
        if (Math.abs(pt.x - edgeDrag.startX) < 4 && Math.abs(pt.y - edgeDrag.startY) < 4) return
        // 脱离两端节点，转为坐标点
        const sp = edgeDrag.edge.getSourcePoint()
        const tp = edgeDrag.edge.getTargetPoint()
        edgeDrag.edge.setSource(sp)
        edgeDrag.edge.setTarget(tp)
        edgeDrag.detached = true
        edgeWasDragged = true
      }
      const dx = pt.x - edgeDrag.lastX
      const dy = pt.y - edgeDrag.lastY
      // 移动 source
      const sp = edgeDrag.edge.getSourcePoint()
      edgeDrag.edge.setSource({ x: sp.x + dx, y: sp.y + dy })
      // 移动 target
      const tp = edgeDrag.edge.getTargetPoint()
      edgeDrag.edge.setTarget({ x: tp.x + dx, y: tp.y + dy })
      // 移动顶点
      const verts = edgeDrag.edge.getVertices()
      if (verts.length > 0) {
        edgeDrag.edge.setVertices(verts.map((v) => ({ x: v.x + dx, y: v.y + dy })))
      }
      edgeDrag.lastX = pt.x
      edgeDrag.lastY = pt.y
    }

    const handleEdgeMouseUp = () => {
      edgeDrag = null
    }

    document.addEventListener('mousemove', handleEdgeMouseMove)
    document.addEventListener('mouseup', handleEdgeMouseUp)

    // 点击空白处移除所有边工具
    graph.on('blank:click', () => {
      graph.getEdges().forEach((edge: Edge) => {
        edge.removeTools()
      })
    })

    // 点击节点时移除边工具
    graph.on('node:click', () => {
      graph.getEdges().forEach((edge: Edge) => {
        edge.removeTools()
      })
    })

    // 取消选中时恢复连线样式
    graph.on('blank:click', () => {
      graph.getEdges().forEach((edge: Edge) => {
        edge.attr('line/stroke', '#A2B1C3')
        edge.attr('line/strokeWidth', 2)
      })
    })

    // 点击节点时取消所有连线的选中状态
    graph.on('node:click', ({ node }: { node: Node }) => {
      graph.getEdges().forEach((edge: Edge) => {
        edge.attr('line/stroke', '#A2B1C3')
        edge.attr('line/strokeWidth', 2)
      })
    })

    // 选中节点时显示连接点，取消选中时隐藏
    const showNodePorts = (targetNode: Node) => {
      graph.getNodes().forEach((n: Node) => {
        n.getPorts().forEach((port) => {
          if (port.id) n.portProp(port.id, 'attrs/circle/opacity', n.id === targetNode.id ? 1 : 0)
        })
      })
    }

    const hideAllPorts = () => {
      graph.getNodes().forEach((n: Node) => {
        n.getPorts().forEach((port) => {
          if (port.id) n.portProp(port.id, 'attrs/circle/opacity', 0)
        })
      })
    }

    graph.on('blank:click', () => {
      setSelectedNode(null)
      setSelectedEdge(null)
      hideAllPorts()
    })

    graph.on('node:removed', () => {
      setSelectedNode(null)
    })

    // 按 Delete 键删除选中的连线或节点
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey
      if (isMod && e.key === 'z') {
        e.preventDefault()
        e.stopPropagation()
        if (e.shiftKey) {
          history.redo()
        } else {
          history.undo()
        }
        return
      }
      if (isMod && e.key === 'y') {
        e.preventDefault()
        e.stopPropagation()
        history.redo()
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const node = selectedNodeRef.current
        const edge = selectedEdgeRef.current
        if (node) {
          e.preventDefault()
          e.stopPropagation()
          const cell = graph.getCellById(node.id)
          if (cell) graph.removeCells([cell])
        } else if (edge) {
          e.preventDefault()
          e.stopPropagation()
          const cell = graph.getCellById(edge.id)
          if (cell) graph.removeCells([cell])
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true })

    if (initialFlow && initialFlow.nodes.length > 0) {
      initialFlow.nodes.forEach((node) => {
        const style = getNodeStyle(node.type)
        graph.addNode({
          id: node.id,
          shape: style.shape || 'rect',
          x: node.position.x,
          y: node.position.y,
          width: style.width,
          height: style.height,
          label: node.label,
          attrs: buildNodeAttrs(node.type, style.color),
      ports: getNodePorts(node.type),
          data: {
            type: node.type,
            config: node.config,
          },
        })
      })

      initialFlow.edges.forEach((edge) => {
        const arrow = edge.arrow || 'forward'
        const markerConfig = getMarkerConfig(arrow)
        const edgeConfig: Record<string, unknown> = {
          id: edge.id,
          source: edge.source || edge.sourcePoint,
          target: edge.target || edge.targetPoint,
          labels: edge.label ? [{
            attrs: {
              text: { text: edge.label, fill: '#722ed1', fontSize: 13, fontWeight: 'bold' },
              rect: { fill: '#fff', stroke: '#722ed1', strokeWidth: 1, rx: 6, ry: 6, refWidth: '140%', refHeight: '140%', refX: -4, refY: -4 },
            },
            position: { distance: 0.5, offset: -12 },
          }] : [],
          attrs: {
            line: {
              stroke: '#A2B1C3',
              strokeWidth: 2,
              ...markerConfig,
            },
          },
          zIndex: 10,
          data: { arrow },
        }
        if (edge.sourcePort) edgeConfig.sourcePort = edge.sourcePort
        if (edge.targetPort) edgeConfig.targetPort = edge.targetPort
        graph.addEdge(edgeConfig)
      })
    } else {
      const startNode = graph.addNode({
        id: uuid(),
        shape: 'rect',
        x: 100,
        y: 200,
        width: 60,
        height: 60,
        label: '开始',
        attrs: {
          body: {
            fill: '#fff',
            rx: 30,
            ry: 30,
            stroke: '#000',
            strokeWidth: 2,
          },
          label: {
            fill: '#000',
            fontSize: 12,
          },
        },
        data: { type: 'start', config: {} },
        ports: getNodePorts('start'),
      })

      const endNode = graph.addNode({
        id: uuid(),
        shape: 'rect',
        x: 500,
        y: 200,
        width: 60,
        height: 60,
        label: '结束',
        attrs: {
          body: {
            fill: '#fff',
            rx: 30,
            ry: 30,
            stroke: '#000',
            strokeWidth: 2,
          },
          label: {
            fill: '#000',
            fontSize: 12,
          },
        },
        data: { type: 'end', config: {} },
        ports: getNodePorts('end'),
      })

      graph.addEdge({
        id: uuid(),
        source: startNode.id,
        sourcePort: 'right',
        target: endNode.id,
        targetPort: 'left',
        attrs: {
          line: {
            stroke: '#A2B1C3',
            strokeWidth: 2,
            targetMarker: {
              name: 'block',
              width: 12,
              height: 8,
            },
            sourceMarker: null,
          },
        },
        zIndex: 10,
        vertices: [],
        data: { arrow: 'forward' },
      })
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
      document.removeEventListener('mousemove', handleEdgeMouseMove)
      document.removeEventListener('mouseup', handleEdgeMouseUp)
      graph.dispose()
      graphRef.current = null
      setSelectedNode(null)
    }
  }, [open, initialFlow])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const data = e.dataTransfer.getData('application/x-flow-node')
    if (data) {
      const item = JSON.parse(data)
      setDragPreview({
        x: e.clientX - rect.left - 60,
        y: e.clientY - rect.top - 25,
        label: item.label,
        color: item.color,
      })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragPreview(null)
    if (!graphRef.current) return

    const data = e.dataTransfer.getData('application/x-flow-node')
    if (!data) return

    const item = JSON.parse(data)
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left - 60
    const y = e.clientY - rect.top - 25

    if (item.type === 'line') {
      const startX = Math.max(0, x)
      const startY = Math.max(0, y)
      graphRef.current.addEdge({
        id: uuid(),
        source: { x: startX, y: startY },
        target: { x: startX + 120, y: startY },
        attrs: {
          line: {
            stroke: '#A2B1C3',
            strokeWidth: 2,
            targetMarker: { name: 'block', width: 12, height: 8 },
            sourceMarker: null,
          },
        },
        zIndex: 10,
        data: { arrow: 'forward' },
      })
      return
    }

    const style = getNodeStyle(item.type)
    const nodeX = Math.max(0, x)
    const nodeY = Math.max(0, y)
    const nodeWidth = style.width
    const nodeHeight = style.height

    const addedNode = graphRef.current.addNode({
      id: uuid(),
      shape: style.shape || 'rect',
      x: nodeX,
      y: nodeY,
      width: nodeWidth,
      height: nodeHeight,
      label: item.label,
      attrs: buildNodeAttrs(item.type, item.color),
      ports: getNodePorts(item.type),
      data: {
        type: item.type,
        config: item.defaultConfig,
      },
    })

    if (item.type === 'condition') {
      // 为条件分支自动创建两个默认连线（是/否）
      const labelStyle = {
        attrs: {
          text: { fill: '#722ed1', fontSize: 13, fontWeight: 'bold' },
          rect: { fill: '#fff', stroke: '#722ed1', strokeWidth: 1, rx: 6, ry: 6, refWidth: '140%', refHeight: '140%', refX: -4, refY: -4 },
        },
        position: { distance: 0.5, offset: -12 },
      }

      // 是 - 右边
      graphRef.current.addEdge({
        id: uuid(),
        source: addedNode.id,
        sourcePort: 'right',
        target: { x: nodeX + nodeWidth + 80, y: nodeY + nodeHeight / 2 },
        labels: [{ ...labelStyle, attrs: { ...labelStyle.attrs, text: { ...labelStyle.attrs.text, text: '是' } } }],
        attrs: {
          line: {
            stroke: '#000',
            strokeWidth: 2,
            targetMarker: { name: 'block', width: 12, height: 8 },
          },
        },
        zIndex: 10,
        data: { arrow: 'forward' },
      })

      // 否 - 下边
      graphRef.current.addEdge({
        id: uuid(),
        source: addedNode.id,
        sourcePort: 'bottom',
        target: { x: nodeX + nodeWidth / 2, y: nodeY + nodeHeight + 80 },
        labels: [{ ...labelStyle, attrs: { ...labelStyle.attrs, text: { ...labelStyle.attrs.text, text: '否' } } }],
        attrs: {
          line: {
            stroke: '#000',
            strokeWidth: 2,
            targetMarker: { name: 'block', width: 12, height: 8 },
          },
        },
        zIndex: 10,
        data: { arrow: 'forward' },
      })
    }
  }

  const handleDragLeave = () => {
    setDragPreview(null)
  }

  const handleSave = () => {
    if (!graphRef.current) return

    const nodes = graphRef.current.getNodes().map((node) => ({
      id: node.id,
      type: node.getData().type,
      label: node.getAttrByPath('text/text') as string,
      position: {
        x: node.position().x,
        y: node.position().y,
      },
      config: node.getData().config || {},
    }))

    const edges = graphRef.current.getEdges().map((edge) => {
      const label = edge.getLabels()?.[0]?.attrs?.text?.text
      const data = edge.getData() || {}
      const sourceCellId = edge.getSourceCellId()
      const targetCellId = edge.getTargetCellId()
      const sourcePortId = edge.getSourcePortId()
      const targetPortId = edge.getTargetPortId()

      const edgeData: Record<string, unknown> = {
        id: edge.id,
        arrow: data.arrow || 'forward',
      }

      if (typeof label === 'string') edgeData.label = label

      if (sourceCellId) {
        edgeData.source = sourceCellId
        if (sourcePortId) edgeData.sourcePort = sourcePortId
      } else {
        const sp = edge.getSourcePoint()
        edgeData.sourcePoint = { x: sp.x, y: sp.y }
      }

      if (targetCellId) {
        edgeData.target = targetCellId
        if (targetPortId) edgeData.targetPort = targetPortId
      } else {
        const tp = edge.getTargetPoint()
        edgeData.targetPoint = { x: tp.x, y: tp.y }
      }

      return edgeData
    })

    onSave({ nodes, edges } as Flow)
  }

  const handleNodeConfigChange = (config: Record<string, unknown>) => {
    if (!selectedNode || !graphRef.current) return

    const node = graphRef.current.getCellById(selectedNode.id)
    if (node) {
      node.setData({ ...node.getData(), config })
      setSelectedNode({ ...selectedNode, config })
    }
  }

  const handleNodeLabelChange = (label: string) => {
    if (!selectedNode || !graphRef.current) return
    const node = graphRef.current.getCellById(selectedNode.id)
    if (node) {
      node.setAttrByPath('text/text', label)
    }
    setSelectedNode({ ...selectedNode, label })
  }

  const handleEdgeChange = (arrow: string, label: string) => {
    if (!selectedEdge || !graphRef.current) return

    const cell = graphRef.current.getCellById(selectedEdge.id)
    if (!cell || !cell.isEdge()) return

    const markerConfig = getMarkerConfig(arrow)
    cell.attr('line/targetMarker', markerConfig.targetMarker)
    cell.attr('line/sourceMarker', markerConfig.sourceMarker)

    if (label) {
      cell.setLabels([{ text: label }])
    } else {
      cell.setLabels([])
    }

    const data = cell.getData() || {}
    cell.setData({ ...data, arrow })

    setSelectedEdge({ ...selectedEdge, arrow, label })
  }

  if (!open) return null

  return (
    <div className="flow-editor-overlay" onClick={onClose}>
      <div className="flow-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flow-editor-header">
          <h3>事件流程编辑器</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="flow-editor-body">
          <FlowNodePalette />

          <div
            className="flow-canvas-container"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
          >
            <div ref={containerRef} className="flow-canvas" />
            {dragPreview && (
              <div
                className="drag-preview-node"
                style={{
                  left: dragPreview.x,
                  top: dragPreview.y,
                  backgroundColor: dragPreview.color,
                }}
              >
                {dragPreview.label}
              </div>
            )}
          </div>

          <FlowPropertyPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onConfigChange={handleNodeConfigChange}
            onLabelChange={handleNodeLabelChange}
            onEdgeChange={handleEdgeChange}
          />
        </div>

        <div className="flow-editor-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  )
}
