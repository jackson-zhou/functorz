const nodeTypes = [
    {
      category: '基础操作',
      items: [
        { type: 'api', label: 'API调用', icon: '🔌', color: '#1890ff', defaultConfig: { url: '', method: 'GET' as const, body: '' } },
        { type: 'alert', label: '通知提示', icon: '💬', color: '#faad14', defaultConfig: { type: 'info' as const, message: '' } },
        { type: 'navigate', label: '页面跳转', icon: '➡️', color: '#13c2c2', defaultConfig: { pageId: '' } },
        { type: 'setData', label: '填充数据', icon: '📥', color: '#fa8c16', defaultConfig: { target: '', source: '' } },
      ],
    },
  {
    category: '控制流',
    items: [
      { type: 'condition', label: '条件分支', icon: '◇', color: '#722ed1', defaultConfig: { expression: '' } },
    ],
  },
  {
    category: '图形',
    items: [
      { type: 'line', label: '箭头线', icon: '→', color: '#A2B1C3', defaultConfig: { arrow: 'forward' as const } },
    ],
  },
]

export default function FlowNodePalette() {
  const handleDragStart = (e: React.DragEvent, item: { type: string; label: string; color: string; defaultConfig: Record<string, unknown> }) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('application/x-flow-node', JSON.stringify(item))
  }

  return (
    <div className="flow-node-palette">
      <h4>节点面板</h4>
      {nodeTypes.map((category) => (
        <div key={category.category} className="palette-category">
          <div className="palette-category-label">{category.category}</div>
          {category.items.map((item) => (
            <div
              key={item.type}
              className="palette-item"
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
            >
              <span className="palette-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
