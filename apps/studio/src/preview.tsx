import React from 'react'
import { createRoot } from 'react-dom/client'
import { previewMessage } from './preview-protocol'
import { validateProject, type ComponentNode } from '@functorz/schema'
import './styles.css'
const sizes: Record<string, number> = { none: 0, xs: 4, sm: 8, md: 16, lg: 24, xl: 36 }
const fonts: Record<string, number> = { xs: 12, sm: 14, md: 16, lg: 20, xl: 28 }
const radii: Record<string, number> = { none: 0, sm: 4, md: 10, lg: 18, pill: 999 }

function nodeStyle(node: ComponentNode): React.CSSProperties {
  const s = node.style ?? {}
  return {
    color: s.color,
    backgroundColor: s.backgroundColor,
    fontSize: s.fontSize ? fonts[s.fontSize] : undefined,
    padding: s.spacing ? sizes[s.spacing] : undefined,
    borderRadius: s.radius ? radii[s.radius] : undefined,
    gap: s.gap ? sizes[s.gap] : undefined,
    alignItems: s.align === 'start' ? 'flex-start' : s.align === 'end' ? 'flex-end' : s.align,
    width: s.width,
    height: s.height,
    minHeight: s.minHeight,
    flex: s.flex,
    paddingTop: s.paddingTop,
    paddingRight: s.paddingRight,
    paddingBottom: s.paddingBottom,
    paddingLeft: s.paddingLeft,
    marginTop: s.marginTop,
    marginRight: s.marginRight,
    marginBottom: s.marginBottom,
    marginLeft: s.marginLeft,
    border: s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor ?? '#e5e7eb'}` : undefined,
    position: s.position,
    top: s.top,
    right: s.right,
    bottom: s.bottom,
    left: s.left,
    zIndex: s.zIndex,
    overflow: s.overflow,
    fontWeight: s.fontWeight === 'medium' ? 500 : s.fontWeight === 'semibold' ? 600 : s.fontWeight,
    textAlign: s.textAlign,
    objectFit: s.objectFit,
  }
}

function Node({ node }: { node: ComponentNode }) {
  const children = node.children.map((c) => <Node key={c.id} node={c} />)
  const style = nodeStyle(node)

  switch (node.type) {
    case 'Page':
      return <div className="web-node type-page" style={style}>{children}</div>
    case 'Section':
      return <div className="web-node type-section" style={style}>{children}</div>
    case 'Card':
      return <div className="web-node type-card" style={style}>{children}</div>
    case 'Flex': {
      const dir = node.props.direction === 'column' ? 'column' : 'row'
      const jc = String(node.props.justifyContent ?? 'flex-start')
      const ai = String(node.props.alignItems ?? 'stretch')
      const wrap = String(node.props.wrap ?? 'nowrap')
      return (
        <div
          className="web-node type-flex"
          style={{
            ...style,
            display: 'flex',
            flexDirection: dir,
            justifyContent: jc,
            alignItems: ai,
            flexWrap: wrap as React.CSSProperties['flexWrap'],
          }}
        >
          {children}
        </div>
      )
    }
    case 'Grid':
      return (
        <div className="web-node type-grid" style={{ ...style, display: 'grid', gridTemplateColumns: node.props.columns ? `repeat(${node.props.columns}, 1fr)` : undefined }}>
          {children}
        </div>
      )
    case 'Text':
      return <span className="web-node" style={style}>{String(node.props.text ?? '')}</span>
    case 'Image':
      return <img className="web-node type-image" style={style} src={String(node.props.src ?? '')} />
    case 'Button':
      return (
        <button className={`web-node type-button-text variant-${String(node.props.variant ?? 'primary')}`} style={style}>
          {String(node.props.text ?? '按钮')}
        </button>
      )
    case 'Divider':
      return <div className="web-node type-divider" style={style} />
    case 'Spacer':
      return <div className="web-node" style={{ height: sizes[String(node.props.size ?? 'md')] ?? 16 }} />
    case 'Input': {
      const icon = node.props.icon as string | undefined
      return (
        <div className="web-node type-input" style={style}>
          {icon === 'search' && <span className="input-icon">🔍</span>}
          {node.props.label ? <label>{String(node.props.label)}</label> : null}
          <input placeholder={String(node.props.placeholder ?? '')} />
        </div>
      )
    }
    case 'SearchBar':
      return (
        <div className="web-node commerce-search" style={style}>
          <span className="commerce-scan" aria-hidden="true">⌗</span>
          <span className="commerce-search-placeholder">{String(node.props.placeholder ?? '搜索商品')}</span>
          {Boolean(node.props.showButton) && (
            <span className="commerce-search-button">{String(node.props.buttonText ?? '搜索')}</span>
          )}
        </div>
      )
    case 'ProductCard':
      return (
        <article className="web-node commerce-product-card" style={style}>
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
    case 'Tabs': {
      const itemsStr = String(node.props.items ?? '')
      const items = itemsStr.split(',').map((s) => s.trim())
      const activeIndex = Number(node.props.activeIndex ?? 0)
      return (
        <div className="web-node type-tabs" style={style}>
          <div className="tabs-header">
            {items.map((item, idx) => (
              <div key={idx} className={`tab-item${idx === activeIndex ? ' active' : ''}`}>
                {item}
              </div>
            ))}
          </div>
          <div className="tabs-content">{children}</div>
        </div>
      )
    }
    case 'Badge': {
      const text = String(node.props.text ?? '')
      const variant = String(node.props.variant ?? 'default')
      const shape = String(node.props.shape ?? 'rounded')
      const borderRadius = shape === 'pill' ? '9999px' : shape === 'circle' ? '50%' : '4px'
      return (
        <span className={`web-node type-badge badge-${variant}`} style={{ ...style, borderRadius }}>
          {text}
        </span>
      )
    }
    case 'Tag': {
      const text = String(node.props.text ?? '')
      const variant = String(node.props.variant ?? 'default')
      return (
        <span className={`web-node type-tag tag-${variant}`} style={style}>
          {text}
        </span>
      )
    }
    case 'FAB': {
      const icon = String(node.props.icon ?? 'plus')
      const position = String(node.props.position ?? 'bottom-right')
      const label = String(node.props.label ?? '')
      const posStyle: React.CSSProperties = {}
      if (position.includes('bottom')) posStyle.bottom = '20px'
      if (position.includes('top')) posStyle.top = '20px'
      if (position.includes('right')) posStyle.right = '20px'
      if (position.includes('left')) posStyle.left = '20px'
      return (
        <div className="web-node type-fab" style={{ ...style, ...posStyle }}>
          <div className="fab-circle">{icon === 'plus' ? '+' : icon}</div>
          {label && <div className="fab-label">{label}</div>}
        </div>
      )
    }
    case 'AppHeader':
      return (
        <div className="web-node pet-app-header" style={style}>
          <span className="pet-menu" aria-hidden="true"><i /><i /><i /></span>
          <strong>{String(node.props.title ?? '活体')}</strong>
          <span className="pet-capsule" aria-hidden="true">
            <b>•••</b><i /><em>—</em><i /><span>●</span>
          </span>
        </div>
      )
    case 'PetCard': {
      const gender = String(node.props.gender ?? 'female')
      const image = String(node.props.image ?? '')
      return (
        <article className="web-node pet-card" style={style}>
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
              <div className="pet-meta">
                <span>{String(node.props.code ?? '—')}</span>
                <span>{String(node.props.status ?? '—')}</span>
              </div>
            </div>
          </div>
          <div className="pet-actions"><button>登录</button><button>复制</button><button>修改</button></div>
        </article>
      )
    }
    case 'BottomNav': {
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
        <nav className="web-node pet-bottom-nav commerce-bottom-nav" style={style}>
          {items.map((item, index) => (
            <button key={`${item}-${index}`} className={`${index === activeIndex ? 'active' : ''}${item === '添加' ? ' add' : ''}`}>
              <span>{icons[item] ?? '•'}</span>{item !== '添加' && <small>{item}</small>}
            </button>
          ))}
        </nav>
      )
    }
    case 'Swiper':
    case 'Form':
    default:
      return <div className={`web-node type-${node.type.toLowerCase()}`} style={style}>{children}</div>
  }
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
