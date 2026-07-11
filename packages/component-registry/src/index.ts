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
  /** Kept for loading and migrating old projects, but hidden from new authoring flows. */
  deprecated?: boolean
  /** Per-item field schema for list components (renders as inline form instead of JSON textarea). */
  itemSchema?: PropertyField[]
  /** Maximum number of placeholder items shown in the editor. */
  maxItems?: number
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
    properties: [
      { key: 'direction', label: '方向', kind: 'select', options: ['row', 'column'] },
      { key: 'justifyContent', label: '主轴对齐', kind: 'select', options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'] },
      { key: 'alignItems', label: '交叉轴对齐', kind: 'select', options: ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'] },
      { key: 'wrap', label: '换行', kind: 'select', options: ['nowrap', 'wrap', 'wrap-reverse'] },
    ],
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
    properties: [
      { key: 'text', label: '文字', kind: 'text', required: true },
      { key: 'variant', label: '样式', kind: 'select', options: ['primary', 'text'] },
    ],
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
      defaultProps: { name: 'field', label: '字段', placeholder: '请输入', inputType: 'text' },
      properties: [
        { key: 'name', label: '字段名', kind: 'text', required: true },
        { key: 'label', label: '标签', kind: 'text', required: true },
        { key: 'placeholder', label: '占位文字', kind: 'text' },
        { key: 'required', label: '必填', kind: 'boolean' },
        { key: 'inputType', label: '输入类型', kind: 'select', options: ['text', 'password', 'number', 'tel', 'email'] },
        { key: 'icon', label: '图标', kind: 'select', options: ['none', 'search'] },
      ],
    }),
    SearchBar: def({
      type: 'SearchBar',
      label: '搜索栏',
      category: 'content',
      container: false,
      defaultProps: { placeholder: '搜索商品', showButton: true, buttonText: '搜索' },
      properties: [
        { key: 'placeholder', label: '占位文字', kind: 'text' },
        { key: 'showButton', label: '显示搜索按钮', kind: 'boolean' },
        { key: 'buttonText', label: '按钮文字', kind: 'text' },
      ],
    }),
    ProductCard: def({
      type: 'ProductCard',
      label: '商品卡片',
      category: 'content',
      container: false,
      defaultProps: {
        name: '商品名称',
        price: '99.00',
        originalPrice: '',
        image: 'https://placehold.co/300x300',
        tag: '',
        sales: '',
      },
      properties: [
        { key: 'name', label: '商品名称', kind: 'text', required: true },
        { key: 'price', label: '售价', kind: 'text', required: true },
        { key: 'originalPrice', label: '原价（划线价）', kind: 'text' },
        { key: 'image', label: '商品图片', kind: 'url', required: true },
        { key: 'tag', label: '标签文字', kind: 'text' },
        { key: 'sales', label: '已售数量', kind: 'text' },
      ],
    }),
    KingKongList: def({
      type: 'KingKongList',
      label: '金刚位列表',
      category: 'content',
      container: false,
      defaultProps: { dataSource: 'home.kingKong', columns: 5, items: '[]' },
      properties: [
        { key: 'dataSource', label: '数据源路径', kind: 'text', required: true },
        { key: 'columns', label: '列数', kind: 'number' },
        { key: 'items', label: '占位数据', kind: 'text' },
      ],
      itemSchema: [
        { key: 'icon', label: '图标', kind: 'text' },
        { key: 'label', label: '文字', kind: 'text' },
        { key: 'color', label: '颜色', kind: 'color' },
      ],
      maxItems: 5,
    }),
    ProductList: def({
      type: 'ProductList',
      label: '商品列表',
      category: 'content',
      container: false,
      defaultProps: { dataSource: 'home.products', columns: 2, items: '[]' },
      properties: [
        { key: 'dataSource', label: '数据源路径', kind: 'text', required: true },
        { key: 'columns', label: '列数', kind: 'number' },
        { key: 'items', label: '占位数据', kind: 'text' },
      ],
      itemSchema: [
        { key: 'name', label: '商品名称', kind: 'text' },
        { key: 'price', label: '售价', kind: 'text' },
        { key: 'image', label: '图片地址', kind: 'url' },
        { key: 'tag', label: '标签', kind: 'text' },
        { key: 'sales', label: '销量', kind: 'text' },
      ],
      maxItems: 4,
    }),
    Countdown: def({
      type: 'Countdown',
      label: '倒计时',
      category: 'content',
      container: false,
      defaultProps: { label: '距结束', deadline: '' },
      properties: [
        { key: 'label', label: '提示文字', kind: 'text' },
        { key: 'deadline', label: '截止时间（ISO 8601）', kind: 'text' },
      ],
    }),
  Tabs: def({
    type: 'Tabs',
    label: '标签页',
    category: 'layout',
    container: true,
    defaultProps: { activeIndex: 0, items: '全部,待出售,种公,种母', dataSource: '', variant: 'default' },
    properties: [
      { key: 'activeIndex', label: '默认激活索引', kind: 'number' },
      { key: 'items', label: '标签项（逗号分隔）', kind: 'text', required: true },
      { key: 'dataSource', label: '数据源路径', kind: 'text' },
      { key: 'variant', label: '样式', kind: 'select', options: ['default', 'commerce'] },
    ],
    accepts: ['Section', 'Flex', 'Grid', 'Card'],
  }),
  Badge: def({
    type: 'Badge',
    label: '徽章',
    category: 'content',
    container: false,
    defaultProps: { text: '徽章', variant: 'default' },
    properties: [
      { key: 'text', label: '文字', kind: 'text', required: true },
      { key: 'variant', label: '样式', kind: 'select', options: ['default', 'primary', 'success', 'warning', 'danger', 'info'] },
      { key: 'shape', label: '形状', kind: 'select', options: ['rounded', 'pill', 'circle'] },
    ],
  }),
  Tag: def({
    type: 'Tag',
    label: '标签',
    category: 'content',
    container: false,
    defaultProps: { text: '标签', variant: 'default' },
    properties: [
      { key: 'text', label: '文字', kind: 'text', required: true },
      { key: 'variant', label: '样式', kind: 'select', options: ['default', 'primary', 'success', 'warning', 'danger', 'info'] },
    ],
  }),
  FAB: def({
    type: 'FAB',
    label: '浮动按钮',
    category: 'content',
    container: false,
    defaultProps: { icon: 'plus', position: 'bottom-right' },
    properties: [
      { key: 'icon', label: '图标', kind: 'select', options: ['plus', 'edit', 'delete', 'share'] },
      { key: 'position', label: '位置', kind: 'select', options: ['bottom-right', 'bottom-left', 'top-right', 'top-left'] },
      { key: 'label', label: '提示文字', kind: 'text' },
    ],
  }),
  AppHeader: def({
    type: 'AppHeader',
    label: '小程序标题栏',
    category: 'layout',
    container: false,
    defaultProps: { title: '活体' },
    properties: [{ key: 'title', label: '标题', kind: 'text', required: true }],
    deprecated: true,
  }),
  PetCard: def({
    type: 'PetCard',
    label: '活体卡片',
    category: 'content',
    container: false,
    defaultProps: {
      name: '宠物名称',
      age: '1岁',
      breed: '',
      code: '-',
      status: '现役',
      gender: 'female',
    },
    properties: [
      { key: 'name', label: '名称', kind: 'text', required: true },
      { key: 'age', label: '年龄', kind: 'text' },
      { key: 'breed', label: '品种', kind: 'text' },
      { key: 'code', label: '编号', kind: 'text' },
      { key: 'status', label: '状态', kind: 'text' },
      { key: 'gender', label: '性别', kind: 'select', options: ['male', 'female'] },
      { key: 'image', label: '图片地址', kind: 'url' },
    ],
    deprecated: true,
  }),
    BottomNav: def({
      type: 'BottomNav',
      label: '底部导航',
      category: 'layout',
      container: false,
      defaultProps: {
        items: '["首页","分类","购物车","我的"]',
        activeIndex: 0,
      },
      properties: [
        { key: 'items', label: '导航项（逗号分隔）', kind: 'text', required: true },
        { key: 'activeIndex', label: '默认激活索引', kind: 'number' },
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
    if (value === undefined || (!field.required && value === '')) continue
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
