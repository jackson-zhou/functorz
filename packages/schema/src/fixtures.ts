import type { ComponentNode, PageSchema, ProjectSchema } from './index.js'
const ids = {
  project: '00000000-0000-4000-8000-000000000001',
  home: '00000000-0000-4000-8000-000000000101',
  detail: '00000000-0000-4000-8000-000000000102',
  form: '00000000-0000-4000-8000-000000000103',
}
let seq = 200
const node = (
  type: ComponentNode['type'],
  props: Record<string, unknown> = {},
  children: ComponentNode[] = [],
  style?: ComponentNode['style'],
): ComponentNode => ({
  id: `00000000-0000-4000-8000-${String(seq++).padStart(12, '0')}`,
  type,
  props,
  children,
  ...(style ? { style } : {}),
})
export const homePage: PageSchema = {
  id: ids.home,
  name: '首页',
  route: '/pages/home',
  root: node('Page', {}, [
    node(
      'Section',
      {},
      [
        node('Text', { text: '让灵感变成小程序' }, [], { fontSize: 'xl', color: '#172033' }),
        node('Text', { text: '无需编码，拖拽即可发布' }, [], { color: '#697386' }),
        node('Button', { text: '开始探索' }, [], {
          backgroundColor: '#5b5bd6',
          color: '#ffffff',
          radius: 'pill',
        }),
      ],
      { spacing: 'lg', gap: 'md' },
    ),
    node(
      'Grid',
      {},
      [
        node('Card', {}, [node('Text', { text: '新品推荐' })]),
        node('Card', {}, [node('Text', { text: '热门活动' })]),
      ],
      { columns: 2, gap: 'md', spacing: 'md' },
    ),
  ] as ComponentNode[]),
}
export const detailPage: PageSchema = {
  id: ids.detail,
  name: '详情',
  route: '/pages/detail',
  root: node('Page', {}, [
    node('Image', { src: 'https://images.example.com/product.jpg', alt: '产品图' }),
    node(
      'Section',
      {},
      [
        node('Text', { text: '轻盈通勤双肩包' }, [], { fontSize: 'xl' }),
        node('Text', { text: '兼顾设计、容量与日常舒适度。' }),
        node('Divider'),
        node('Button', { text: '立即咨询' }),
      ],
      { spacing: 'lg', gap: 'md' },
    ),
  ]),
}
export const formPage: PageSchema = {
  id: ids.form,
  name: '预约',
  route: '/pages/form',
  root: node('Page', {}, [
    node(
      'Section',
      {},
      [
        node('Text', { text: '预约体验' }, [], { fontSize: 'xl' }),
        node('Form', {}, [
          node('Input', { name: 'name', label: '姓名', placeholder: '请输入姓名', required: true }),
          node('Input', {
            name: 'phone',
            label: '手机号',
            placeholder: '请输入手机号',
            required: true,
          }),
          node('Button', { text: '提交预约' }),
        ]),
      ],
      { spacing: 'lg', gap: 'md' },
    ),
  ]),
}
export const demoProject: ProjectSchema = {
  version: 1,
  id: ids.project,
  name: '品牌展示 Demo',
  theme: {
    primaryColor: '#5b5bd6',
    backgroundColor: '#f6f7fb',
    textColor: '#172033',
    radius: 'md',
  },
  pages: [homePage, detailPage, formPage],
}
