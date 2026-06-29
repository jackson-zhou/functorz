import type { ReactNode } from 'react'
import { Button, Form, Image, Input, Swiper, SwiperItem, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
  validateProject,
  type ActionSchema,
  type ComponentNode,
  type PageSchema,
  type ProjectSchema,
} from '@functorz/schema'
import { sizes, tokenStyle } from './styles.js'
export { tokenStyle } from './styles.js'
export async function executeAction(action: ActionSchema | undefined): Promise<void> {
  if (!action) return
  if (action.type === 'navigate')
    await Taro.navigateTo({ url: `/pages/index/index?pageId=${action.pageId}` })
  else if (action.type === 'back') await Taro.navigateBack()
}
export function SchemaRenderer({ project, pageId }: { project: ProjectSchema; pageId?: string }) {
  let parsed: ProjectSchema
  try {
    parsed = validateProject(project)
  } catch (error) {
    return <Fallback message={error instanceof Error ? error.message : 'Invalid schema'} />
  }
  const page = parsed.pages.find((item) => item.id === pageId) ?? parsed.pages[0]
  return page ? <NodeRenderer node={page.root} /> : <Fallback message="Page not found" />
}
export function PageRenderer({ page }: { page: PageSchema }) {
  return <NodeRenderer node={page.root} />
}
export function NodeRenderer({ node }: { node: ComponentNode }): ReactNode {
  const children = node.children.map((child) => <NodeRenderer key={child.id} node={child} />)
  const style = tokenStyle(node)
  const click = () => void executeAction(node.action)
  switch (node.type) {
    case 'Page':
    case 'Section':
    case 'Card':
      return (
        <View style={style} className={`fz-${node.type.toLowerCase()}`} onClick={click}>
          {children}
        </View>
      )
    case 'Flex':
      return (
        <View
          style={{
            ...style,
            display: 'flex',
            flexDirection: node.props.direction === 'column' ? 'column' : 'row',
          }}
        >
          {children}
        </View>
      )
    case 'Grid':
      return <View style={{ ...style, display: 'grid' }}>{children}</View>
    case 'Text':
      return <Text style={style}>{String(node.props.text ?? '')}</Text>
    case 'Image':
      return <Image style={style} src={String(node.props.src ?? '')} mode="aspectFill" />
    case 'Button':
      return (
        <Button style={style} onClick={click}>
          {String(node.props.text ?? '按钮')}
        </Button>
      )
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
    case 'Input':
      return (
        <View style={style}>
          <Text>{String(node.props.label ?? '')}</Text>
          <Input
            name={String(node.props.name ?? 'field')}
            placeholder={String(node.props.placeholder ?? '')}
          />
        </View>
      )
    default:
      return <Fallback message={`Unsupported component: ${String((node as ComponentNode).type)}`} />
  }
}
export function Fallback({ message }: { message: string }) {
  return (
    <View style={{ padding: 12, backgroundColor: '#fff1f0', color: '#b42318' }}>{message}</View>
  )
}
