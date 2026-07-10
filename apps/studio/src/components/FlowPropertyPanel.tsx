interface FlowPropertyPanelProps {
  selectedNode: { id: string; type: string; label: string; config: Record<string, unknown> } | null
  selectedEdge: { id: string; arrow: string; label: string } | null
  onConfigChange: (config: Record<string, unknown>) => void
  onLabelChange: (label: string) => void
  onEdgeChange: (arrow: string, label: string) => void
}

export default function FlowPropertyPanel({ selectedNode, selectedEdge, onConfigChange, onLabelChange, onEdgeChange }: FlowPropertyPanelProps) {
  if (selectedEdge) {
    return (
      <div className="flow-property-panel">
        <h4>连线属性</h4>
        <div className="property-group">
          <label>连线标签</label>
          <input
            type="text"
            value={selectedEdge.label}
            onChange={(e) => onEdgeChange(selectedEdge.arrow, e.target.value)}
            placeholder="连线标签（可选）"
          />
        </div>
        <div className="property-group">
          <label>箭头方向</label>
          <select
            value={selectedEdge.arrow}
            onChange={(e) => onEdgeChange(e.target.value, selectedEdge.label)}
          >
            <option value="forward">正向 (→)</option>
            <option value="backward">反向 (←)</option>
            <option value="both">双向 (↔)</option>
            <option value="none">无箭头 (—)</option>
          </select>
        </div>
      </div>
    )
  }

  if (!selectedNode) {
    return (
      <div className="flow-property-panel">
        <h4>属性配置</h4>
        <div className="property-empty">选择节点查看属性</div>
      </div>
    )
  }

  const renderConfigFields = () => {
    switch (selectedNode.type) {
      case 'api': {
        const method = (selectedNode.config.method as string) || 'GET'
        return (
          <>
            <div className="property-group">
              <label>接口地址</label>
              <input
                type="text"
                value={(selectedNode.config.url as string) || ''}
                onChange={(e) => onConfigChange({ ...selectedNode.config, url: e.target.value })}
                placeholder="https://api.example.com"
              />
            </div>
            <div className="property-group">
              <label>请求方法</label>
              <select
                value={method}
                onChange={(e) => onConfigChange({ ...selectedNode.config, method: e.target.value })}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
            {method === 'POST' && (
              <div className="property-group">
                <label>请求体</label>
                <textarea
                  value={(selectedNode.config.body as string) || ''}
                  onChange={(e) => onConfigChange({ ...selectedNode.config, body: e.target.value })}
                  placeholder={`{\n  "phone": "{{phone}}",\n  "password": "{{password}}"\n}`}
                  rows={4}
                />
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                  使用 {'{{'}字段名{'}}'} 引用表单输入值
                </div>
              </div>
            )}
          </>
        )
      }

      case 'alert':
        return (
          <>
            <div className="property-group">
              <label>提示类型</label>
              <select
                value={(selectedNode.config.type as string) || 'info'}
                onChange={(e) => onConfigChange({ ...selectedNode.config, type: e.target.value })}
              >
                <option value="info">信息</option>
                <option value="success">成功</option>
                <option value="error">错误</option>
              </select>
            </div>
            <div className="property-group">
              <label>提示内容</label>
              <textarea
                value={(selectedNode.config.message as string) || ''}
                onChange={(e) => onConfigChange({ ...selectedNode.config, message: e.target.value })}
                placeholder="请输入提示内容"
              />
            </div>
          </>
        )

      case 'navigate':
        return (
          <div className="property-group">
            <label>目标页面ID</label>
            <input
              type="text"
              value={(selectedNode.config.pageId as string) || ''}
              onChange={(e) => onConfigChange({ ...selectedNode.config, pageId: e.target.value })}
              placeholder="页面 UUID"
            />
          </div>
        )

      case 'setData':
        return (
          <>
            <div className="property-group">
              <label>数据目标</label>
              <input
                type="text"
                value={(selectedNode.config.target as string) || ''}
                onChange={(e) => onConfigChange({ ...selectedNode.config, target: e.target.value })}
                placeholder="如 productList"
              />
            </div>
            <div className="property-group">
              <label>数据来源</label>
              <input
                type="text"
                value={(selectedNode.config.source as string) || ''}
                onChange={(e) => onConfigChange({ ...selectedNode.config, source: e.target.value })}
                placeholder="如 response.data.products"
              />
            </div>
          </>
        )

      case 'condition':
        return (
          <>
            <div className="property-group">
              <label>判断条件</label>
              <input
                type="text"
                value={(selectedNode.config.expression as string) || ''}
                onChange={(e) => onConfigChange({ ...selectedNode.config, expression: e.target.value })}
                placeholder="如 response.code == 0"
              />
            </div>
            <div style={{ padding: '8px 0', fontSize: '12px', color: '#6b7280', lineHeight: '1.6' }}>
              <div>分支方向：</div>
              <div>• 右 → 条件满足时执行</div>
              <div>• 下 → 条件不满足时执行</div>
            </div>
          </>
        )

      default:
        return <div style={{ color: '#999', fontSize: '13px' }}>此节点无需配置</div>
    }
  }

  return (
    <div className="flow-property-panel">
      <h4>属性配置</h4>

      {selectedNode.type !== 'start' && selectedNode.type !== 'end' && (
        <div className="property-group">
          <label>节点名称</label>
          <input
            type="text"
            value={selectedNode.label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="输入节点名称"
          />
        </div>
      )}

      {renderConfigFields()}
    </div>
  )
}
