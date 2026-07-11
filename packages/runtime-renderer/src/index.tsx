import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Form, Image, Input, ScrollView, Swiper, SwiperItem, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useDidShow } from '@tarojs/taro'
import {
  validateProject,
  type ComponentNode,
  type Flow,
  type PageSchema,
  type ProjectSchema,
} from '@functorz/schema'
import { sizes, tokenStyle } from './styles.js'
import { executeFlow, getPath, setPath, type RuntimeData } from './flow-runtime.js'
export { tokenStyle } from './styles.js'
export { evaluateCondition, executeFlow, getPath, setPath } from './flow-runtime.js'

interface RuntimeContextValue {
  data: RuntimeData
  runFlow: (flow: Flow, signal?: AbortSignal) => Promise<void>
}
const RuntimeDataContext = createContext<RuntimeContextValue>({ data: {}, runFlow: async () => undefined })
function listItems(node: ComponentNode, runtimeData: RuntimeData): Record<string, unknown>[] {
  const bound = getPath(runtimeData, String(node.props.dataSource ?? ''))
  if (Array.isArray(bound)) return bound.filter((item) => item && typeof item === 'object') as Record<string, unknown>[]
  try {
    const fallback = JSON.parse(String(node.props.items ?? '[]'))
    return Array.isArray(fallback) ? fallback : []
  } catch {
    return []
  }
}
export function SchemaRenderer({ project, pageId }: { project: ProjectSchema; pageId?: string }) {
  let parsed: ProjectSchema
  try {
    parsed = validateProject(project)
  } catch (error) {
    return <Fallback message={error instanceof Error ? error.message : 'Invalid schema'} />
  }
  const page = parsed.pages.find((item) => item.id === pageId) ?? parsed.pages[0]
  return page ? <RuntimePage key={page.id} page={page} /> : <Fallback message="Page not found" />
}
export function PageRenderer({ page }: { page: PageSchema }) {
  return <RuntimePage key={page.id} page={page} />
}
function RuntimePage({ page }: { page: PageSchema }) {
  const [data, updateData] = useState<RuntimeData>({})
  const dataRef = useRef(data)
  const running = useRef(false)
  const showRunning = useRef(false)
  dataRef.current = data
  const runFlow = (flow: Flow, signal?: AbortSignal) => executeFlow(flow, {
    data: dataRef.current,
    signal,
    setData: (path, value) => updateData((current) => {
      const next = setPath(current, path, value)
      dataRef.current = next
      return next
    }),
  })
  useEffect(() => {
    const flow = page.root.events?.load
    if (!flow || running.current) return
    const controller = new AbortController()
    running.current = true
    void runFlow(flow, controller.signal).finally(() => { running.current = false })
    return () => controller.abort()
  }, [page.id, page.root.events?.load])
  useDidShow(() => {
    const flow = page.root.events?.show
    if (!flow || showRunning.current) return
    showRunning.current = true
    void runFlow(flow).finally(() => { showRunning.current = false })
  })
  return <RuntimeDataContext.Provider value={{ data, runFlow }}><NodeRenderer node={page.root} /></RuntimeDataContext.Provider>
}
export function NodeRenderer({ node }: { node: ComponentNode }): ReactNode {
  const runtime = useContext(RuntimeDataContext)
  const runtimeData = runtime.data
  const children = node.children.map((child) => <NodeRenderer key={child.id} node={child} />)
  const style = tokenStyle(node)
  const click = node.events?.tap ? () => void runtime.runFlow(node.events!.tap!) : undefined
  switch (node.type) {
    case 'Page':
    case 'Section':
    case 'Card':
      return (
        <View style={style} className={`fz-${node.type.toLowerCase()}`} onClick={click}>
          {children}
        </View>
      )
    case 'Flex': {
      const direction = node.props.direction === 'column' ? 'column' : 'row'
      const justifyContent = String(node.props.justifyContent ?? 'flex-start') as any
      const alignItems = String(node.props.alignItems ?? 'stretch') as any
      const wrap = String(node.props.wrap ?? 'nowrap') as any
      return (
        <View
          style={{
            ...style,
            display: 'flex',
            flexDirection: direction,
            justifyContent,
            alignItems,
            flexWrap: wrap,
          }}
        >
          {children}
        </View>
      )
    }
    case 'Grid':
      return <View style={{ ...style, display: 'grid' }}>{children}</View>
    case 'Text':
      return <Text style={style}>{String(node.props.text ?? '')}</Text>
    case 'Image':
      return <Image style={style} src={String(node.props.src ?? '')} mode="aspectFill" />
    case 'Button': {
      const variant = String(node.props.variant ?? 'primary')
      const buttonStyles: Record<string, React.CSSProperties> = {
        primary: {
          padding: '8px 18px',
          fontSize: '14px',
          color: '#ffffff',
          backgroundColor: '#6253e8',
          borderRadius: '9px',
        },
        text: {
          padding: '6px 12px',
          fontSize: '14px',
          color: '#6b7280',
          backgroundColor: 'transparent',
        },
      }
      return (
        <View
          style={{
            ...buttonStyles[variant] || buttonStyles.primary,
            ...style,
          }}
          onClick={click}
        >
          {String(node.props.text ?? '按钮')}
        </View>
      )
    }
    case 'Divider':
      return <View style={{ borderTop: '1px solid #e5e7eb', ...style }} />
    case 'Spacer':
      return (
        <View
          style={{ height: sizes[String(node.props.size ?? 'md') as keyof typeof sizes] ?? 16 }}
        />
      )
    case 'Swiper':
      return (
        <Swiper autoplay={Boolean(node.props.autoplay)} style={style}>
          {node.children.map((child) => (
            <SwiperItem key={child.id}>
              <NodeRenderer node={child} />
            </SwiperItem>
          ))}
        </Swiper>
      )
    case 'Form':
      return <Form style={style}>{children}</Form>
    case 'Input': {
      const icon = node.props.icon as string | undefined
      const inputType = String(node.props.inputType ?? 'text')
      return (
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            gap: '8px',
            ...style,
          }}
        >
          {icon === 'search' && <Text style={{ fontSize: '18px' }}>🔍</Text>}
          <Input
            name={String(node.props.name ?? 'field')}
            placeholder={String(node.props.placeholder ?? '')}
            style={{ flex: 1, fontSize: '15px' }}
            type={inputType as any}
          />
        </View>
      )
    }
    case 'SearchBar': {
      const showButton = node.props.showButton as boolean
      const buttonText = String(node.props.buttonText ?? '搜索')
      return (
        <View
          onClick={click}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: '48px',
            padding: '3px 4px 3px 12px',
            borderRadius: '18px',
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: '#ff5000',
            backgroundColor: '#ffffff',
            gap: '8px',
            ...style,
          }}
        >
          <Text style={{ fontSize: '23px', color: '#ff5000' }}>⌗</Text>
          <Input
            placeholder={String(node.props.placeholder ?? '搜索商品')}
            style={{ flex: 1, fontSize: '16px', color: '#28222a' }}
          />
          <Text style={{ fontSize: '20px', color: '#9aa8b8' }}>◎</Text>
          {showButton && (
            <View
              style={{
                alignSelf: 'stretch',
                minWidth: '72px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '14px',
                backgroundColor: '#ff5000',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: '700',
              }}
            >
              {buttonText}
            </View>
          )}
        </View>
      )
    }
    case 'ProductCard': {
      const name = String(node.props.name ?? '')
      const price = String(node.props.price ?? '')
      const originalPrice = String(node.props.originalPrice ?? '')
      const image = String(node.props.image ?? '')
      const tag = String(node.props.tag ?? '')
      const sales = String(node.props.sales ?? '')
      return (
        <View
          onClick={click}
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            overflow: 'hidden',
            ...style,
          }}
        >
          <Image
            src={image}
            mode="aspectFill"
            style={{ width: '100%', aspectRatio: '1/1' }}
          />
          <View style={{ padding: '8px 12px' }}>
            <Text
              style={{
                fontSize: '14px',
                lineHeight: '20px',
                fontWeight: '500',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {name}
            </Text>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', marginTop: '4px', gap: '6px' }}>
              <Text style={{ fontSize: '18px', fontWeight: '700', color: '#ef4444' }}>
                ¥{price}
              </Text>
              {originalPrice && (
                <Text
                  style={{
                    fontSize: '12px',
                    color: '#9ca3af',
                    textDecoration: 'line-through',
                  }}
                >
                  ¥{originalPrice}
                </Text>
              )}
            </View>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '4px',
              }}
            >
              {tag ? (
                <View
                  style={{
                    padding: '2px 6px',
                    backgroundColor: '#fff0e9',
                    borderRadius: '4px',
                    fontSize: '10px',
                    color: '#ff5000',
                  }}
                >
                  {tag}
                </View>
              ) : <View />}
              {sales ? (
                <Text style={{ fontSize: '11px', color: '#9ca3af' }}>
                  已售 {sales}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      )
    }
    case 'KingKongList': {
      const items = listItems(node, runtimeData)
      const columns = Math.max(1, Math.min(6, Number(node.props.columns ?? 5)))
      return (
        <View style={{ ...style, display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: '8px' }}>
          {items.map((item, index) => (
            <View key={String(item.id ?? index)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: 0 }}>
              <View style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', backgroundColor: String(item.color ?? '#ff5000'), color: '#ffffff', fontSize: '20px', fontWeight: '700' }}>
                {String(item.icon ?? item.label ?? '')}
              </View>
              <Text style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#29242a', fontSize: '12px', fontWeight: '500' }}>
                {String(item.label ?? '')}
              </Text>
            </View>
          ))}
        </View>
      )
    }
    case 'ProductList': {
      const items = listItems(node, runtimeData)
      const columns = Math.max(1, Math.min(4, Number(node.props.columns ?? 2)))
      const triggeredRef = useRef(false)
      const handleScroll = (e: { detail?: { scrollTop?: number; scrollHeight?: number } }) => {
        if (!node.events?.scroll || triggeredRef.current) return
        const d = e.detail ?? {}
        const st = d.scrollTop ?? 0
        const sh = d.scrollHeight ?? 0
        const ch = (style.height as number) ?? 400
        if (sh > 0 && (st + ch) / sh >= 0.66) {
          triggeredRef.current = true
          void runtime.runFlow(node.events.scroll)
        }
      }
      return (
        <ScrollView scrollY style={{ ...style, height: style.height ?? '400px', display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: '8px' }} onScroll={handleScroll}>
          {items.map((item, index) => (
            <View key={String(item.id ?? index)} style={{ display: 'flex', minWidth: 0, flexDirection: 'column', overflow: 'hidden', borderRadius: '10px', backgroundColor: '#ffffff' }}>
              <Image src={String(item.image ?? '')} mode="aspectFill" style={{ width: '100%', aspectRatio: '1/1' }} />
              <View style={{ padding: '8px 10px 10px' }}>
                <Text style={{ minHeight: '40px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', color: '#241f24', fontSize: '14px', lineHeight: '20px', fontWeight: '500' }}>
                  {String(item.name ?? '')}
                </Text>
                {item.tag ? <Text style={{ display: 'block', marginTop: '4px', color: '#ff5000', fontSize: '11px' }}>{String(item.tag)}</Text> : null}
                <View style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '5px', gap: '4px' }}>
                  <Text style={{ color: '#ff5000', fontSize: '19px', fontWeight: '700' }}>¥{String(item.price ?? '')}</Text>
                  {item.sales ? <Text style={{ color: '#999399', fontSize: '10px' }}>{String(item.sales)}</Text> : null}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )
    }
    case 'Countdown': {
      const label = String(node.props.label ?? '距结束')
      return (
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '6px',
            ...style,
          }}
        >
          <Text style={{ fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>{label}</Text>
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <View
              style={{
                padding: '2px 4px',
                backgroundColor: '#ef4444',
                borderRadius: '2px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '600',
                minWidth: '22px',
                textAlign: 'center',
              }}
            >
              02
            </View>
            <Text style={{ color: '#ef4444', fontWeight: '600' }}>:</Text>
            <View
              style={{
                padding: '2px 4px',
                backgroundColor: '#ef4444',
                borderRadius: '2px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '600',
                minWidth: '22px',
                textAlign: 'center',
              }}
            >
              30
            </View>
            <Text style={{ color: '#ef4444', fontWeight: '600' }}>:</Text>
            <View
              style={{
                padding: '2px 4px',
                backgroundColor: '#ef4444',
                borderRadius: '2px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '600',
                minWidth: '22px',
                textAlign: 'center',
              }}
            >
              00
            </View>
          </View>
        </View>
      )
    }
    case 'Tabs': {
      const itemsStr = String(node.props.items ?? '')
      const boundItems = getPath(runtimeData, String(node.props.dataSource ?? ''))
      const items = Array.isArray(boundItems)
        ? boundItems.map((item) => typeof item === 'string' ? item : String((item as Record<string, unknown>).label ?? ''))
        : itemsStr.split(',').map((s) => s.trim())
      const activeIndex = Number(node.props.activeIndex ?? 0)
      const commerce = node.props.variant === 'commerce'
      return (
        <View style={style}>
          <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '4px', padding: commerce ? '4px 14px 6px' : '8px 12px 14px', overflow: 'hidden', backgroundColor: commerce ? '#ffffff' : undefined }}>
            {items.map((item, idx) => (
              <View
                key={idx}
                style={{
                  flex: commerce ? '0 0 auto' : undefined,
                  padding: commerce ? '8px 2px 6px' : '7px 15px',
                  borderRadius: commerce ? 0 : '9999px',
                  borderBottom: commerce && idx === activeIndex ? '3px solid #ff5000' : undefined,
                  backgroundColor: !commerce && idx === activeIndex ? '#000000' : 'transparent',
                  color: commerce ? (idx === activeIndex ? '#ff5000' : '#3a3038') : (idx === activeIndex ? '#ffffff' : '#697386'),
                  fontWeight: idx === activeIndex ? '700' : '400',
                  fontSize: commerce && idx === activeIndex ? '18px' : '14px',
                }}
              >
                {item}
              </View>
            ))}
          </View>
          {!commerce && <View style={{ padding: '0 12px 16px' }}>{children}</View>}
        </View>
      )
    }
    case 'Badge': {
      const text = String(node.props.text ?? '')
      const variant = String(node.props.variant ?? 'default')
      const variantColors: Record<string, string> = {
        default: '#f3f4f6',
        primary: '#5b5bd6',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
      }
      const textColor = variant === 'default' ? '#374151' : '#ffffff'
      return (
        <View
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            fontSize: '12px',
            backgroundColor: variantColors[variant] || variantColors.default,
            color: textColor,
            borderRadius: '4px',
            ...style,
          }}
        >
          {text}
        </View>
      )
    }
    case 'Tag': {
      const text = String(node.props.text ?? '')
      const variant = String(node.props.variant ?? 'default')
      const variantColors: Record<string, string> = {
        default: '#f3f4f6',
        primary: '#5b5bd6',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
      }
      const textColor = variant === 'default' ? '#374151' : '#ffffff'
      return (
        <View
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            fontSize: '13px',
            backgroundColor: variantColors[variant] || variantColors.default,
            color: textColor,
            borderRadius: '4px',
            ...style,
          }}
        >
          {text}
        </View>
      )
    }
    case 'FAB': {
      const icon = String(node.props.icon ?? 'plus')
      const position = String(node.props.position ?? 'bottom-right')
      const positionMap: Record<string, React.CSSProperties> = {
        'bottom-right': { bottom: '80px', right: '20px' },
        'bottom-left': { bottom: '80px', left: '20px' },
        'top-right': { top: '20px', right: '20px' },
        'top-left': { top: '20px', left: '20px' },
      }
      const iconMap: Record<string, string> = {
        plus: '+',
        edit: '✏️',
        delete: '️',
        share: '📤',
      }
      return (
        <View
          onClick={click}
          style={{
            position: 'fixed',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 1000,
            ...positionMap[position],
            ...style,
          }}
        >
          <View
            style={{
              width: '62px',
              height: '62px',
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <View style={{ fontSize: '24px', fontWeight: 'bold' }}>{iconMap[icon] || '+'}</View>
          </View>
        </View>
      )
    }
    case 'AppHeader':
      return (
        <View style={{ height: '76px', padding: '10px 17px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', ...style }}>
          <View style={{ width: '36px', fontSize: '26px', lineHeight: '18px', fontWeight: 'bold' }}>☰</View>
          <Text style={{ fontSize: '20px', fontWeight: '600', color: '#232323' }}>{String(node.props.title ?? '活体')}</Text>
          <View style={{ minWidth: '96px', height: '30px', padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e4e4e4', borderRadius: '18px', color: '#222', fontSize: '13px' }}>
            <Text>•••</Text><Text style={{ color: '#ddd' }}>|</Text><Text>━</Text><Text style={{ color: '#ddd' }}>|</Text><Text>◉</Text>
          </View>
        </View>
      )
    case 'PetCard': {
      const gender = String(node.props.gender ?? 'female')
      const image = String(node.props.image ?? '')
      return (
        <View style={{ marginBottom: '18px', overflow: 'hidden', borderRadius: '13px', backgroundColor: '#f4f5f7', color: '#24252a', ...style }}>
          <View style={{ minHeight: '69px', padding: '15px', display: 'flex', flexDirection: 'row', gap: '11px' }}>
            <View style={{ position: 'relative', flex: '0 0 69px', width: '69px', height: '69px' }}>
              {image ? <Image src={image} mode="aspectFill" style={{ width: '69px', height: '69px', borderRadius: '5px' }} /> : <View style={{ width: '69px', height: '69px', borderRadius: '5px', backgroundColor: '#e9ebef' }} />}
              <View style={{ position: 'absolute', top: 0, left: 0, width: '19px', height: '19px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '5px 0 5px 0', backgroundColor: gender === 'male' ? '#6395ef' : '#f06d76', color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>{gender === 'male' ? '♂' : '♀'}</View>
            </View>
            <View style={{ minWidth: 0, flex: 1 }}>
              <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <Text style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '16px', lineHeight: '24px', fontWeight: 'bold' }}>{String(node.props.name ?? '')}</Text>
                {node.props.age ? <Text style={{ flex: 'none', padding: '3px 7px', borderRadius: '5px', backgroundColor: '#fde5c3', color: '#cc8a3d', fontSize: '12px', fontWeight: '600' }}>{String(node.props.age)}</Text> : null}
              </View>
              <View style={{ minHeight: '21px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#8e929b', fontSize: '13px', fontWeight: '600' }}>{String(node.props.breed ?? '—')}</View>
              <View style={{ display: 'flex', flexDirection: 'row', gap: '5px', marginTop: '5px' }}>
                {[node.props.code ?? '—', node.props.status ?? '—'].map((value, index) => <Text key={index} style={{ padding: '2px 6px', border: '1px solid #d9dce2', borderRadius: '4px', color: '#979ba5', backgroundColor: '#f9fafb', fontSize: '12px' }}>{String(value)}</Text>)}
              </View>
            </View>
          </View>
          <View style={{ minHeight: '38px', padding: '0 14px', display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: '20px', borderTop: '1px solid #e0e2e6' }}>
            {['登录', '复制', '修改'].map((action) => <Text key={action} style={{ color: '#686d76', fontSize: '13px', fontWeight: '700' }}>{action}</Text>)}
          </View>
        </View>
      )
    }
    case 'BottomNav': {
      const activeIndex = Number(node.props.activeIndex ?? 0)
      const itemsStr = String(node.props.items ?? '["首页","分类","购物车","我的"]')
      let items: string[] = []
      try {
        items = JSON.parse(itemsStr)
      } catch {
        items = itemsStr.split(',').map((item) => item.trim())
      }
      const icons: Record<string, string> = {
        首页: '淘', 逛逛: '✦', 消息: '▤', 购物车: '□', 我的淘宝: '⌣',
        分类: '📂', 我的: '👤', 活体: '♧', 添加: '+', 繁育: '♧',
      }
      return (
        <View style={{ position: 'fixed', zIndex: 900, left: 0, right: 0, bottom: 0, height: '64px', display: 'flex', flexDirection: 'row', alignItems: 'stretch', borderTop: '1px solid #ebe8e7', backgroundColor: '#fff', boxShadow: '0 -5px 18px rgba(55,43,37,.06)', ...style }}>
          {items.map((item, index) => {
            const isActive = index === activeIndex
            return (
              <View key={`${item}-${index}`} style={{ flex: 1, padding: '5px 0 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: isActive ? '#ff5000' : '#332d32', fontWeight: isActive ? '700' : '400' }}>
                <View style={{ width: isActive ? '34px' : undefined, height: isActive ? '34px' : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: isActive ? '50%' : undefined, backgroundColor: isActive ? '#ff5000' : undefined, color: isActive ? '#ffffff' : undefined, fontSize: '19px', lineHeight: '20px' }}>{icons[item] ?? '•'}</View>
                <Text style={{ fontSize: '11px', marginTop: '2px' }}>{item}</Text>
              </View>
            )
          })}
        </View>
      )
    }
    default:
      return <Fallback message={`Unsupported component: ${String((node as ComponentNode).type)}`} />
  }
}
export function Fallback({ message }: { message: string }) {
  return (
    <View style={{ padding: 12, backgroundColor: '#fff1f0', color: '#b42318' }}>{message}</View>
  )
}
