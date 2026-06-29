import type { ComponentNode, ComponentType } from '@functorz/schema'
export type FieldKind = 'text' | 'textarea' | 'url' | 'boolean' | 'select' | 'color' | 'number'
export interface PropertyField {
  key: string
  label: string
  kind: FieldKind
  options?: string[]
  required?: boolean
}
export interface ComponentDefinition {
  type: ComponentType
  label: string
  category: 'layout' | 'content' | 'form'
  container: boolean
  defaultProps: Record<string, unknown>
  properties: PropertyField[]
  platforms: ('h5' | 'weapp')[]
  accepts?: ComponentType[] | 'any'
}
const both = ['h5', 'weapp'] as const
const def = (value: Omit<ComponentDefinition, 'platforms'>): ComponentDefinition => ({
  ...value,
  platforms: [...both],
})
export const componentRegistry: Record<ComponentType, ComponentDefinition> = {
  Page: def({
    type: 'Page',
    label: '页面',
    category: 'layout',
    container: true,
    defaultProps: {},
    properties: [],
    accepts: 'any',
  }),
  Section: def({
    type: 'Section',
    label: '区块',
    category: 'layout',
    container: true,
    defaultProps: {},
    properties: [],
    accepts: 'any',
  }),
  Flex: def({
    type: 'Flex',
    label: '弹性布局',
    category: 'layout',
    container: true,
    defaultProps: { direction: 'row' },
    properties: [{ key: 'direction', label: '方向', kind: 'select', options: ['row', 'column'] }],
    accepts: 'any',
  }),
  Grid: def({
    type: 'Grid',
    label: '网格',
    category: 'layout',
    container: true,
    defaultProps: {},
    properties: [],
    accepts: 'any',
  }),
  Text: def({
    type: 'Text',
    label: '文字',
    category: 'content',
    container: false,
    defaultProps: { text: '新文字' },
    properties: [{ key: 'text', label: '内容', kind: 'textarea', required: true }],
  }),
  Image: def({
    type: 'Image',
    label: '图片',
    category: 'content',
    container: false,
    defaultProps: { src: 'https://placehold.co/600x360', alt: '' },
    properties: [
      { key: 'src', label: '图片地址', kind: 'url', required: true },
      { key: 'alt', label: '替代文本', kind: 'text' },
    ],
  }),
  Button: def({
    type: 'Button',
    label: '按钮',
    category: 'content',
    container: false,
    defaultProps: { text: '按钮' },
    properties: [{ key: 'text', label: '文字', kind: 'text', required: true }],
  }),
  Card: def({
    type: 'Card',
    label: '卡片',
    category: 'layout',
    container: true,
    defaultProps: {},
    properties: [],
    accepts: 'any',
  }),
  Divider: def({
    type: 'Divider',
    label: '分割线',
    category: 'content',
    container: false,
    defaultProps: {},
    properties: [],
  }),
  Spacer: def({
    type: 'Spacer',
    label: '间距',
    category: 'layout',
    container: false,
    defaultProps: { size: 'md' },
    properties: [
      { key: 'size', label: '尺寸', kind: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    ],
  }),
  Swiper: def({
    type: 'Swiper',
    label: '轮播',
    category: 'layout',
    container: true,
    defaultProps: { autoplay: true },
    properties: [{ key: 'autoplay', label: '自动播放', kind: 'boolean' }],
    accepts: ['Section', 'Image'],
  }),
  Form: def({
    type: 'Form',
    label: '表单',
    category: 'form',
    container: true,
    defaultProps: {},
    properties: [],
    accepts: ['Input', 'Button', 'Section', 'Text'],
  }),
  Input: def({
    type: 'Input',
    label: '输入框',
    category: 'form',
    container: false,
    defaultProps: { name: 'field', label: '字段', placeholder: '请输入' },
    properties: [
      { key: 'name', label: '字段名', kind: 'text', required: true },
      { key: 'label', label: '标签', kind: 'text', required: true },
      { key: 'placeholder', label: '占位文字', kind: 'text' },
      { key: 'required', label: '必填', kind: 'boolean' },
    ],
  }),
}
export function createNode(type: ComponentType, id: string): ComponentNode {
  const item = componentRegistry[type]
  return { id, type, props: structuredClone(item.defaultProps), children: [] }
}
export function canAccept(parent: ComponentType, child: ComponentType): boolean {
  const accepts = componentRegistry[parent].accepts
  return accepts === 'any' || Boolean(accepts?.includes(child))
}
export function validateProps(type: ComponentType, props: Record<string, unknown>): void {
  const fields = componentRegistry[type].properties
  const allowed = new Set(fields.map((field) => field.key))
  for (const key of Object.keys(props))
    if (!allowed.has(key)) throw new Error(`${type} does not define property ${key}`)
  for (const field of fields) {
    const value = props[field.key]
    if (field.required && (value === undefined || value === ''))
      throw new Error(`${field.label} is required`)
    if (value === undefined) continue
    if (field.kind === 'boolean' && typeof value !== 'boolean')
      throw new Error(`${field.label} must be boolean`)
    if (field.kind === 'number' && typeof value !== 'number')
      throw new Error(`${field.label} must be a number`)
    if (field.kind === 'select' && !field.options?.includes(String(value)))
      throw new Error(`${field.label} has an unsupported value`)
    if (field.kind === 'url') {
      try {
        new URL(String(value))
      } catch {
        throw new Error(`${field.label} must be a valid URL`)
      }
    }
  }
}
