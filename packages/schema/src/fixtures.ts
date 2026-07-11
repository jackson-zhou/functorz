import type { ComponentNode, PageSchema, ProjectSchema, Flow } from './index.js'
const ids = {
  project: '00000000-0000-4000-8000-000000000001',
  login: '00000000-0000-4000-8000-000000000103',
  ecommerce: '00000000-0000-4000-8000-000000000105',
}
let seq = 300
const node = (
  type: ComponentNode['type'],
  props: Record<string, unknown> = {},
  children: ComponentNode[] = [],
  style?: ComponentNode['style'],
  events?: ComponentNode['events'],
): ComponentNode => ({
  id: `00000000-0000-4000-8000-${String(seq++).padStart(12, '0')}`,
  type,
  props,
  children,
  ...(style ? { style } : {}),
  ...(events ? { events } : {}),
})

// ============ 流程节点 ID 生成器 ============
let flowSeq = 1000
const flowNodeId = () => `00000000-0000-4000-8000-${String(flowSeq++).padStart(12, '0')}`
const flowEdgeId = () => `00000000-0000-4000-8000-${String(flowSeq++).padStart(12, '0')}`

// ============ 8 个事件流程定义（使用 as Flow 简化类型检查） ============

// 流程 1: 登录按钮（完整登录流程）- API + 条件
const loginStart = flowNodeId()
const loginApi = flowNodeId()
const loginCondition = flowNodeId()
const loginNav = flowNodeId()
const loginAlert = flowNodeId()
const loginEndYes = flowNodeId()
const loginEndNo = flowNodeId()
const loginFlow: Flow = {
  nodes: [
    { id: loginStart, type: 'start', label: '开始', position: { x: 200, y: 50 }, config: {} as Record<string, unknown> },
    { id: loginApi, type: 'api', label: '登录接口', position: { x: 200, y: 180 }, config: { url: '/api/login', method: 'POST' as const, body: '{\n  "phone": "{{phone}}",\n  "password": "{{password}}"\n}' } },
    { id: loginCondition, type: 'condition', label: '登录成功?', position: { x: 200, y: 310 }, config: { expression: 'response.code == 0 && response.msg contains "成功"' } },
    { id: loginNav, type: 'navigate', label: '跳转首页', position: { x: 200, y: 490 }, config: { pageId: ids.ecommerce } },
    { id: loginAlert, type: 'alert', label: '登录失败', position: { x: 480, y: 490 }, config: { type: 'error' as const, message: '账号或密码错误，请重新输入' } },
    { id: loginEndYes, type: 'end', label: '结束', position: { x: 200, y: 640 }, config: {} as Record<string, unknown> },
    { id: loginEndNo, type: 'end', label: '结束', position: { x: 480, y: 640 }, config: {} as Record<string, unknown> },
  ],
  edges: [
    { id: flowEdgeId(), source: loginStart, sourcePort: 'out', target: loginApi, targetPort: 'in', arrow: 'forward' },
    { id: flowEdgeId(), source: loginApi, sourcePort: 'out', target: loginCondition, targetPort: 'in', arrow: 'forward' },
    { id: flowEdgeId(), source: loginCondition, sourcePort: 'out', target: loginNav, targetPort: 'in', label: '是', arrow: 'forward' },
    { id: flowEdgeId(), source: loginCondition, sourcePort: 'right', target: loginAlert, targetPort: 'in', label: '否', arrow: 'forward' },
    { id: flowEdgeId(), source: loginNav, sourcePort: 'out', target: loginEndYes, targetPort: 'in', arrow: 'forward' },
    { id: flowEdgeId(), source: loginAlert, sourcePort: 'out', target: loginEndNo, targetPort: 'in', arrow: 'forward' },
  ],
}

// 流程 2: 忘记密码 - 简单跳转
const forgotStart = flowNodeId()
const forgotNav = flowNodeId()
const forgotEnd = flowNodeId()
const forgotPasswordFlow: Flow = {
  nodes: [
    { id: forgotStart, type: 'start', label: '开始', position: { x: 200, y: 50 }, config: {} as Record<string, unknown> },
    { id: forgotNav, type: 'navigate', label: '忘记密码页', position: { x: 200, y: 200 }, config: { pageId: ids.login } },
    { id: forgotEnd, type: 'end', label: '结束', position: { x: 200, y: 350 }, config: {} as Record<string, unknown> },
  ],
  edges: [
    { id: flowEdgeId(), source: forgotStart, target: forgotNav, arrow: 'forward' },
    { id: flowEdgeId(), source: forgotNav, target: forgotEnd, arrow: 'forward' },
  ],
}

// 流程 3: 注册账号 - 简单跳转
const registerStart = flowNodeId()
const registerNav = flowNodeId()
const registerEnd = flowNodeId()
const registerFlow: Flow = {
  nodes: [
    { id: registerStart, type: 'start', label: '开始', position: { x: 200, y: 50 }, config: {} as Record<string, unknown> },
    { id: registerNav, type: 'navigate', label: '注册页', position: { x: 200, y: 200 }, config: { pageId: ids.login } },
    { id: registerEnd, type: 'end', label: '结束', position: { x: 200, y: 350 }, config: {} as Record<string, unknown> },
  ],
  edges: [
    { id: flowEdgeId(), source: registerStart, target: registerNav, arrow: 'forward' },
    { id: flowEdgeId(), source: registerNav, target: registerEnd, arrow: 'forward' },
  ],
}

// 流程 4: 商品卡片点击（含库存检查）- API + 条件
const productStart = flowNodeId()
const productApi = flowNodeId()
const productCondition = flowNodeId()
const productNav = flowNodeId()
const productAlert = flowNodeId()
const productEndYes = flowNodeId()
const productEndNo = flowNodeId()
const productClickFlow: Flow = {
  nodes: [
    { id: productStart, type: 'start', label: '开始', position: { x: 200, y: 50 }, config: {} as Record<string, unknown> },
    { id: productApi, type: 'api', label: '查询库存', position: { x: 200, y: 180 }, config: { url: '/api/product/:id', method: 'GET' as const } },
    { id: productCondition, type: 'condition', label: '库存>0?', position: { x: 200, y: 310 }, config: { expression: 'response.stock > 0' } },
    { id: productNav, type: 'navigate', label: '商品详情', position: { x: 200, y: 490 }, config: { pageId: ids.ecommerce } },
    { id: productAlert, type: 'alert', label: '已售罄', position: { x: 480, y: 490 }, config: { type: 'info' as const, message: '该商品已售罄，敬请期待补货' } },
    { id: productEndYes, type: 'end', label: '结束', position: { x: 200, y: 640 }, config: {} as Record<string, unknown> },
    { id: productEndNo, type: 'end', label: '结束', position: { x: 480, y: 640 }, config: {} as Record<string, unknown> },
  ],
  edges: [
    { id: flowEdgeId(), source: productStart, target: productApi, arrow: 'forward' },
    { id: flowEdgeId(), source: productApi, target: productCondition, arrow: 'forward' },
    { id: flowEdgeId(), source: productCondition, target: productNav, label: '是', arrow: 'forward' },
    { id: flowEdgeId(), source: productCondition, target: productAlert, label: '否', arrow: 'forward' },
    { id: flowEdgeId(), source: productNav, target: productEndYes, arrow: 'forward' },
    { id: flowEdgeId(), source: productAlert, target: productEndNo, arrow: 'forward' },
  ],
}

// 流程 5: 搜索栏点击（含空值校验）- 条件
const searchStart = flowNodeId()
const searchCondition = flowNodeId()
const searchNav = flowNodeId()
const searchAlert = flowNodeId()
const searchEndYes = flowNodeId()
const searchEndNo = flowNodeId()
const searchFlow: Flow = {
  nodes: [
    { id: searchStart, type: 'start', label: '开始', position: { x: 200, y: 50 }, config: {} as Record<string, unknown> },
    { id: searchCondition, type: 'condition', label: '关键词非空?', position: { x: 200, y: 180 }, config: { expression: 'keyword != ""' } },
    { id: searchNav, type: 'navigate', label: '搜索结果', position: { x: 200, y: 360 }, config: { pageId: ids.ecommerce } },
    { id: searchAlert, type: 'alert', label: '请输入关键词', position: { x: 480, y: 360 }, config: { type: 'info' as const, message: '请输入搜索关键词' } },
    { id: searchEndYes, type: 'end', label: '结束', position: { x: 200, y: 510 }, config: {} as Record<string, unknown> },
    { id: searchEndNo, type: 'end', label: '结束', position: { x: 480, y: 510 }, config: {} as Record<string, unknown> },
  ],
  edges: [
    { id: flowEdgeId(), source: searchStart, target: searchCondition, arrow: 'forward' },
    { id: flowEdgeId(), source: searchCondition, target: searchNav, label: '是', arrow: 'forward' },
    { id: flowEdgeId(), source: searchCondition, target: searchAlert, label: '否', arrow: 'forward' },
    { id: flowEdgeId(), source: searchNav, target: searchEndYes, arrow: 'forward' },
    { id: flowEdgeId(), source: searchAlert, target: searchEndNo, arrow: 'forward' },
  ],
}

// 流程 6: Banner 轮播点击 - 简单跳转
const bannerStart = flowNodeId()
const bannerNav = flowNodeId()
const bannerEnd = flowNodeId()
const bannerFlow: Flow = {
  nodes: [
    { id: bannerStart, type: 'start', label: '开始', position: { x: 200, y: 50 }, config: {} as Record<string, unknown> },
    { id: bannerNav, type: 'navigate', label: '活动详情页', position: { x: 200, y: 200 }, config: { pageId: ids.ecommerce } },
    { id: bannerEnd, type: 'end', label: '结束', position: { x: 200, y: 350 }, config: {} as Record<string, unknown> },
  ],
  edges: [
    { id: flowEdgeId(), source: bannerStart, target: bannerNav, arrow: 'forward' },
    { id: flowEdgeId(), source: bannerNav, target: bannerEnd, arrow: 'forward' },
  ],
}

// 流程 7: 底部导航切换（含登录校验）- 条件 + 两个 navigate
const navStart = flowNodeId()
const navCondition = flowNodeId()
const navPage = flowNodeId()
const navLogin = flowNodeId()
const navEndYes = flowNodeId()
const navEndNo = flowNodeId()
const navFlow: Flow = {
  nodes: [
    { id: navStart, type: 'start', label: '开始', position: { x: 200, y: 50 }, config: {} as Record<string, unknown> },
    { id: navCondition, type: 'condition', label: '已登录?', position: { x: 200, y: 180 }, config: { expression: 'isLogin == true' } },
    { id: navPage, type: 'navigate', label: '对应页面', position: { x: 200, y: 360 }, config: { pageId: ids.ecommerce } },
    { id: navLogin, type: 'navigate', label: '登录页', position: { x: 480, y: 360 }, config: { pageId: ids.login } },
    { id: navEndYes, type: 'end', label: '结束', position: { x: 200, y: 510 }, config: {} as Record<string, unknown> },
    { id: navEndNo, type: 'end', label: '结束', position: { x: 480, y: 510 }, config: {} as Record<string, unknown> },
  ],
  edges: [
    { id: flowEdgeId(), source: navStart, target: navCondition, arrow: 'forward' },
    { id: flowEdgeId(), source: navCondition, target: navPage, label: '是', arrow: 'forward' },
    { id: flowEdgeId(), source: navCondition, target: navLogin, label: '否', arrow: 'forward' },
    { id: flowEdgeId(), source: navPage, target: navEndYes, arrow: 'forward' },
    { id: flowEdgeId(), source: navLogin, target: navEndNo, arrow: 'forward' },
  ],
}

// 流程 8: 首页加载（页面级 load 事件）- 三个独立 API + 条件 + setData
const homeLoadStart = flowNodeId()
// 导航栏
const tabsApi = flowNodeId()
const tabsCondition = flowNodeId()
const tabsSetData = flowNodeId()
const tabsAlert = flowNodeId()
// 金刚位
const kingKongApi = flowNodeId()
const kingKongCondition = flowNodeId()
const kingKongSetData = flowNodeId()
const kingKongAlert = flowNodeId()
// 商品列表
const productsApi = flowNodeId()
const productsCondition = flowNodeId()
const productsSetData = flowNodeId()
const productsAlert = flowNodeId()
// 结束
const homeLoadEnd = flowNodeId()
const pageLoadFlow: Flow = {
  nodes: [
    { id: homeLoadStart, type: 'start', label: '进入页面', position: { x: 300, y: 30 }, config: {} as Record<string, unknown> },
    // —— 导航栏 ——
    { id: tabsApi, type: 'api', label: '获取导航栏', position: { x: 300, y: 150 }, config: { url: '/api/home/tabs', method: 'GET' as const } },
    { id: tabsCondition, type: 'condition', label: '请求成功?', position: { x: 300, y: 270 }, config: { expression: 'response.code == 0' } },
    { id: tabsSetData, type: 'setData', label: '更新导航栏', position: { x: 300, y: 420 }, config: { target: 'home.tabs', source: 'response.data' } },
    { id: tabsAlert, type: 'alert', label: '使用默认导航', position: { x: 580, y: 420 }, config: { type: 'warning' as const, message: '导航栏加载失败，使用默认数据' } },
    // —— 金刚位 ——
    { id: kingKongApi, type: 'api', label: '获取金刚位', position: { x: 300, y: 540 }, config: { url: '/api/home/kingkong', method: 'GET' as const } },
    { id: kingKongCondition, type: 'condition', label: '请求成功?', position: { x: 300, y: 660 }, config: { expression: 'response.code == 0' } },
    { id: kingKongSetData, type: 'setData', label: '更新金刚位', position: { x: 300, y: 810 }, config: { target: 'home.kingKong', source: 'response.data' } },
    { id: kingKongAlert, type: 'alert', label: '使用默认金刚位', position: { x: 580, y: 810 }, config: { type: 'warning' as const, message: '金刚位加载失败，使用默认数据' } },
    // —— 商品列表 ——
    { id: productsApi, type: 'api', label: '获取商品列表', position: { x: 300, y: 930 }, config: { url: '/api/home/products', method: 'GET' as const } },
    { id: productsCondition, type: 'condition', label: '请求成功?', position: { x: 300, y: 1050 }, config: { expression: 'response.code == 0' } },
    { id: productsSetData, type: 'setData', label: '更新商品列表', position: { x: 300, y: 1200 }, config: { target: 'home.products', source: 'response.data' } },
    { id: productsAlert, type: 'alert', label: '使用默认商品', position: { x: 580, y: 1200 }, config: { type: 'warning' as const, message: '商品列表加载失败，使用默认数据' } },
    // —— 结束 ——
    { id: homeLoadEnd, type: 'end', label: '完成', position: { x: 300, y: 1320 }, config: {} as Record<string, unknown> },
  ],
  edges: [
    // start → 导航栏 API
    { id: flowEdgeId(), source: homeLoadStart, target: tabsApi, arrow: 'forward' },
    { id: flowEdgeId(), source: tabsApi, target: tabsCondition, arrow: 'forward' },
    { id: flowEdgeId(), source: tabsCondition, target: tabsSetData, label: 'yes', arrow: 'forward' },
    { id: flowEdgeId(), source: tabsCondition, target: tabsAlert, label: 'no', arrow: 'forward' },
    // 导航栏 → 金刚位 API（成功/失败都汇合）
    { id: flowEdgeId(), source: tabsSetData, target: kingKongApi, arrow: 'forward' },
    { id: flowEdgeId(), source: tabsAlert, target: kingKongApi, arrow: 'forward' },
    { id: flowEdgeId(), source: kingKongApi, target: kingKongCondition, arrow: 'forward' },
    { id: flowEdgeId(), source: kingKongCondition, target: kingKongSetData, label: 'yes', arrow: 'forward' },
    { id: flowEdgeId(), source: kingKongCondition, target: kingKongAlert, label: 'no', arrow: 'forward' },
    // 金刚位 → 商品列表 API（成功/失败都汇合）
    { id: flowEdgeId(), source: kingKongSetData, target: productsApi, arrow: 'forward' },
    { id: flowEdgeId(), source: kingKongAlert, target: productsApi, arrow: 'forward' },
    { id: flowEdgeId(), source: productsApi, target: productsCondition, arrow: 'forward' },
    { id: flowEdgeId(), source: productsCondition, target: productsSetData, label: 'yes', arrow: 'forward' },
    { id: flowEdgeId(), source: productsCondition, target: productsAlert, label: 'no', arrow: 'forward' },
    // 商品列表 → 结束
    { id: flowEdgeId(), source: productsSetData, target: homeLoadEnd, arrow: 'forward' },
    { id: flowEdgeId(), source: productsAlert, target: homeLoadEnd, arrow: 'forward' },
  ],
}

// ============ 流程 9: 商品列表滚动加载更多 ============
const loadMoreStart = flowNodeId()
const loadMoreApi = flowNodeId()
const loadMoreCondition = flowNodeId()
const loadMoreSetData = flowNodeId()
const loadMoreAlert = flowNodeId()
const loadMoreEndOk = flowNodeId()
const loadMoreEndFail = flowNodeId()
const loadMoreFlow: Flow = {
  nodes: [
    { id: loadMoreStart, type: 'start', label: '滚动到 2/3', position: { x: 200, y: 50 }, config: {} as Record<string, unknown> },
    { id: loadMoreApi, type: 'api', label: '请求第2页', position: { x: 200, y: 180 }, config: { url: '/api/home/products?page=2', method: 'GET' as const } },
    { id: loadMoreCondition, type: 'condition', label: '请求成功?', position: { x: 200, y: 310 }, config: { expression: 'response.code == 0' } },
    { id: loadMoreSetData, type: 'setData', label: '追加商品', position: { x: 200, y: 490 }, config: { target: 'home.products', source: 'response.data' } },
    { id: loadMoreAlert, type: 'alert', label: '加载失败', position: { x: 480, y: 490 }, config: { type: 'info' as const, message: '没有更多商品了' } },
    { id: loadMoreEndOk, type: 'end', label: '结束', position: { x: 200, y: 640 }, config: {} as Record<string, unknown> },
    { id: loadMoreEndFail, type: 'end', label: '结束', position: { x: 480, y: 640 }, config: {} as Record<string, unknown> },
  ],
  edges: [
    { id: flowEdgeId(), source: loadMoreStart, target: loadMoreApi, arrow: 'forward' },
    { id: flowEdgeId(), source: loadMoreApi, target: loadMoreCondition, arrow: 'forward' },
    { id: flowEdgeId(), source: loadMoreCondition, target: loadMoreSetData, label: '是', arrow: 'forward' },
    { id: flowEdgeId(), source: loadMoreCondition, target: loadMoreAlert, label: '否', arrow: 'forward' },
    { id: flowEdgeId(), source: loadMoreSetData, target: loadMoreEndOk, arrow: 'forward' },
    { id: flowEdgeId(), source: loadMoreAlert, target: loadMoreEndFail, arrow: 'forward' },
  ],
}

// ============ 登录页 ============
export const loginPage: PageSchema = {
  id: ids.login,
  name: '登录页',
  route: '/pages/login',
  root: node('Page', {}, [
    node(
      'Flex',
      { direction: 'column', alignItems: 'center' },
      [
        node('Spacer', { size: 'xl' }),
        node('Image', { src: 'https://picsum.photos/seed/logo/160/160', alt: 'Logo' }, [], { width: 80, height: 80 }),
        node('Spacer', { size: 'md' }),
        node('Text', { text: '欢迎回来' }, [], { fontSize: 'lg', fontWeight: 'bold', textAlign: 'center' }),
        node('Spacer', { size: 'sm' }),
        node('Text', { text: '请输入账号信息登录' }, [], { fontSize: 'sm', color: '#85869a' }),
        node('Spacer', { size: 'xl' }),
        node('Form', {}, [
          node('Input', { name: 'phone', label: '手机号', placeholder: '请输入手机号', inputType: 'tel', required: true }),
          node('Input', { name: 'password', label: '密码', placeholder: '请输入密码', inputType: 'password', required: true }),
          node('Button', { text: '登录', variant: 'primary' }, [], {}, { tap: loginFlow }),
        ]),
        node('Spacer', { size: 'md' }),
        node(
          'Flex',
          { direction: 'row', justifyContent: 'space-between' },
          [
            node('Text', { text: '忘记密码?' }, [], { fontSize: 'sm', color: '#6d5dfc' }, { tap: forgotPasswordFlow }),
            node('Text', { text: '注册账号' }, [], { fontSize: 'sm', color: '#6d5dfc' }, { tap: registerFlow }),
          ],
          { gap: 'md' },
        ),
        node('Spacer', { size: 'lg' }),
        node('Divider'),
        node('Spacer', { size: 'md' }),
        node('Text', { text: '其他登录方式' }, [], { fontSize: 'sm', color: '#85869a' }),
        node('Spacer', { size: 'sm' }),
        node(
          'Flex',
          { direction: 'row', justifyContent: 'center' },
          [
            node('Button', { text: '微信登录', variant: 'text' }),
            node('Button', { text: '短信验证', variant: 'text' }),
          ],
          { gap: 'md' },
        ),
      ],
      { spacing: 'xl', gap: 'sm' },
    ),
  ]),
}

// ============ 金刚位项目（带占位图标） ============
// ============ 活动卡片项目 ============
const placeholderImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
      <rect width="400" height="400" rx="28" fill="url(#g)"/>
      <circle cx="315" cy="76" r="74" fill="#fff" fill-opacity=".16"/>
      <circle cx="75" cy="324" r="105" fill="#fff" fill-opacity=".11"/>
      <rect x="72" y="95" width="256" height="180" rx="24" fill="#fff" fill-opacity=".86"/>
      <path d="M108 232l58-62 44 42 34-30 48 50z" fill="${to}" fill-opacity=".62"/>
      <circle cx="255" cy="145" r="22" fill="${from}" fill-opacity=".72"/>
      <text x="200" y="326" text-anchor="middle" fill="#fff" font-size="28" font-weight="700" font-family="Arial, sans-serif">${label}</text>
      <text x="200" y="354" text-anchor="middle" fill="#fff" fill-opacity=".72" font-size="14" font-family="Arial, sans-serif">IMAGE PLACEHOLDER</text>
    </svg>
  `)}`

const defaultProducts = [
  { id: 'sport-1', name: '专业训练乒乓球拍套装 高弹底板横直拍可选', price: '1199', image: placeholderImage('运动好物', '#7c96a7', '#273944'), tag: '天猫 立减10%', sales: '100+' },
  { id: 'digital-1', name: '高颜值透明无线蓝牙耳机 超长续航入耳式', price: '108', image: placeholderImage('数码好物', '#9dc2d4', '#446879'), tag: '天猫 券后价', sales: '6000+' },
  { id: 'keyboard-1', name: '机械键盘 RGB背光青轴', price: '159', image: placeholderImage('电脑配件', '#9d82bc', '#4b3866'), tag: '秒杀', sales: '2345' },
  { id: 'power-1', name: '便携充电宝 20000mAh', price: '79', image: placeholderImage('出行必备', '#f0aa7b', '#9d4e34'), tag: '包邮', sales: '4567' },
]

const activityCard = (title: string, subtitle: string, price: string, image: string) =>
  node('Flex', { direction: 'column' }, [
    node('Text', { text: title }, [], { fontSize: 'sm', fontWeight: 'bold', color: '#241d22' }),
    node('Text', { text: subtitle }, [], { fontSize: 'xs', color: '#ff5000', fontWeight: 'semibold' }),
    node('Image', { src: image, alt: title }, [], { width: 104, height: 82, objectFit: 'cover', radius: 'md' }),
    node('Text', { text: price }, [], { fontSize: 'md', fontWeight: 'bold', color: '#ff3b20' }),
  ], {
    gap: 'xs', radius: 'md', backgroundColor: '#fff7f3', spacing: 'sm',
  })

// ============ 电商首页（淘宝风格） ============
export const ecommercePage: PageSchema = {
  id: ids.ecommerce,
  name: '电商首页',
  route: '/pages/home',
  root: node('Page', {}, [
    // 顶部状态栏占位
    // 顶部导航栏
    node('Tabs', {
      activeIndex: 1,
      items: '关注,推荐,闪购,国补,飞猪,立减',
      dataSource: 'home.tabs',
      variant: 'commerce',
    }),
    // 搜索栏
    node(
      'Section',
      {},
      [
        node('SearchBar', { placeholder: '千本樱', showButton: true, buttonText: '搜索' }, [], {}, { tap: searchFlow }),
      ],
      { spacing: 'sm' },
    ),
    // 金刚位入口（带占位图标）
    node(
      'Section',
      {},
      [
        node('KingKongList', {
          dataSource: 'home.kingKong',
          columns: 5,
          items: JSON.stringify([
            { id: 'farm', icon: '树', label: '芭芭农场', color: '#16c875' },
            { id: 'factory', icon: '淘', label: '淘工厂', color: '#ff5035' },
            { id: 'coin', icon: '币', label: '领淘金币', color: '#ffbd22' },
            { id: 'market', icon: '市', label: '天猫超市', color: '#47cc2e' },
            { id: 'coupon', icon: '¥', label: '红包签到', color: '#f13b42' },
          ]),
        }),
      ],
      { backgroundColor: '#ffffff', spacing: 'sm' },
    ),
    // 活动横滑入口（带占位）
    node(
      'Grid',
      { columns: 3 },
      [
        activityCard('淘宝直播', '好物现场看', '正在直播', placeholderImage('直播画面', '#50505a', '#202028')),
        activityCard('百亿补贴', '官方补贴价', '¥299', placeholderImage('补贴商品', '#dbc9be', '#7d5d56')),
        activityCard('淘宝秒杀', '限时低价抢', '¥5.88', placeholderImage('秒杀商品', '#f3b8a5', '#d84b34')),
      ],
      { gap: 'sm', spacing: 'sm' },
    ),
    // 优惠券横幅（用 Flex 实现）
    node(
      'Flex',
      { direction: 'row', alignItems: 'center', justifyContent: 'space-between' },
      [
        node('Flex', { direction: 'row', alignItems: 'center' }, [
          node('Text', { text: '◀' }, [], { fontSize: 'md', color: '#ffffff' }),
          node('Text', { text: '超级立减  清凉券限时领' }, [], { color: '#fff', fontWeight: 'semibold', fontSize: 'xs' }),
        ], { gap: 'sm' }),
        node('Flex', { direction: 'row', alignItems: 'center' }, [
          node('Text', { text: '¥80  立即领取' }, [], { color: '#ff3b20', fontSize: 'xs', fontWeight: 'bold', textAlign: 'center' }),
        ], { width: 125, backgroundColor: '#ffffff', radius: 'sm', spacing: 'sm' }),
      ],
      { backgroundColor: '#ff2c16', radius: 'md', spacing: 'sm' },
      { tap: bannerFlow },
    ),
    // 为你推荐标题
    node(
      'Flex',
      { direction: 'row', justifyContent: 'space-between', alignItems: 'center' },
      [
        node('Text', { text: '猜你喜欢' }, [], { fontSize: 'md', fontWeight: 'bold', color: '#241d22' }),
        node('Text', { text: '发现今日好物  ›' }, [], { fontSize: 'xs', color: '#8b8589' }),
      ],
      { spacing: 'md' },
    ),
    // 商品网格（带占位数据）
    node('ProductList', {
      dataSource: 'home.products',
      columns: 2,
      items: JSON.stringify(defaultProducts),
    }, [], { spacing: 'sm' }, { scroll: loadMoreFlow }),
    // 底部导航
    node('BottomNav', {
      items: '["首页","逛逛","消息","购物车","我的淘宝"]',
      activeIndex: 0,
    }, [], { width: 390, backgroundColor: '#ffffff' }, { tap: navFlow }),
    // 底部占位
    node('Spacer', { size: 'xl' }, [], { height: 80 }),
  ], { backgroundColor: '#f4f4f4' }, { load: pageLoadFlow }),
}



const petAction = (text: string) =>
  node('Button', { text, variant: 'text' }, [], { color: '#686d76', fontSize: 'sm', fontWeight: 'bold' })

const petCard = (
  name: string,
  age: string,
  breed: string,
  code: string,
  status: string,
  gender: 'male' | 'female',
  image: string,
) =>
  node(
    'Section',
    {},
    [
      node(
        'Flex',
        { direction: 'row', alignItems: 'flex-start' },
        [
          node(
            'Flex',
            { direction: 'row' },
            [
              image
                ? node('Image', { src: image, alt: name }, [], { width: 69, height: 69, objectFit: 'cover' })
                : node('Flex', { direction: 'row' }, [], { width: 69, height: 69, backgroundColor: '#e9ebef' }),
              node(
                'Badge',
                { text: gender === 'male' ? '♂' : '♀', variant: gender === 'male' ? 'info' : 'danger', shape: 'circle' },
                [],
                { width: 19, height: 19 },
              ),
            ],
            { width: 69, height: 69, gap: 'xs' },
          ),
          node(
            'Flex',
            { direction: 'column' },
            [
              node(
                'Flex',
                { direction: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
                [
                  node('Text', { text: name }, [], { fontSize: 'md', fontWeight: 'bold', color: '#24252a' }),
                  ...(age ? [node('Text', { text: age }, [], { spacing: 'xs', fontSize: 'xs', fontWeight: 'semibold', backgroundColor: '#fde5c3', color: '#cc8a3d' })] : []),
                ],
              ),
              node('Text', { text: breed || '—' }, [], { fontSize: 'sm', fontWeight: 'semibold', color: '#8e929b' }),
              node(
                'Flex',
                { direction: 'row' },
                [
                  node('Text', { text: code }, [], { spacing: 'xs', fontSize: 'xs', borderWidth: 1, borderColor: '#d9dce2', color: '#979ba5' }),
                  node('Text', { text: status }, [], { spacing: 'xs', fontSize: 'xs', borderWidth: 1, borderColor: '#d9dce2', color: '#979ba5' }),
                ],
                { gap: 'xs' },
              ),
            ],
            { flex: 1, gap: 'xs' },
          ),
        ],
        { gap: 'md', spacing: 'md' },
      ),
      node('Divider'),
      node(
        'Flex',
        { direction: 'row', justifyContent: 'flex-end', alignItems: 'center' },
        [petAction('登录'), petAction('复制'), petAction('修改')],
        { gap: 'md', spacing: 'sm' },
      ),
    ],
    { backgroundColor: '#f4f5f7' },
  )

export const petManagementPage: PageSchema = {
  id: '00000000-0000-4000-8000-000000000104',
  name: '活体管理',
  route: '/pages/pet-management',
  root: node('Page', {}, [
    node(
      'Flex',
      { direction: 'row', alignItems: 'center', justifyContent: 'space-between' },
      [
        node('Text', { text: '☰' }, [], { fontSize: 'lg', fontWeight: 'bold' }),
        node('Text', { text: '活体' }, [], { fontSize: 'lg', fontWeight: 'semibold' }),
        node('Text', { text: '•••  |  ━  |  ◉' }, [], { fontSize: 'sm', borderWidth: 1, borderColor: '#e4e4e4', spacing: 'sm' }),
      ],
      { height: 64, spacing: 'md' },
    ),
    node(
      'Section',
      { spacing: 'md' },
      [
        node(
          'Input',
          {
            name: 'search',
            label: '',
            placeholder: '请输入宠物昵称/编号',
            icon: 'search'
          },
          [],
          { spacing: 'sm' }
        ),
      ]
    ),
    node(
      'Tabs',
      { items: '全部,待出售,种公,种母', activeIndex: 0 },
      [
        petCard('放大', '1岁', '—', '12321', '现役', 'male', 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=240&q=80'),
        petCard('小欢B17', '8岁5个月', '彭布罗克威尔士柯基犬', '—', '现役', 'female', ''),
        petCard('噢噢噢2·CP3', '1个月', '阿纳托利猫', '2229999–CP35', '—', 'female', 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=240&q=80'),
        petCard('狗狗·CP3', '', '阿纳托利猫', '2221–CP34', '—', 'female', 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=240&q=80'),
      ]
    ),
    node(
      'FAB',
      { icon: 'plus', label: '添加', position: 'bottom-right' },
      [],
      { width: 62, height: 62, backgroundColor: '#f0b557', color: '#3b3020' },
    ),
    node(
      'BottomNav',
      { items: '["消息","活体","添加","繁育","我的"]', activeIndex: 1 },
      [],
      { height: 57, borderWidth: 1, borderColor: '#e4e4e4', backgroundColor: '#ffffff' },
    ),
  ]),
}

export const demoProject: ProjectSchema = {
  version: 2,
  id: ids.project,
  name: '电商 Demo',
  theme: {
    primaryColor: '#ff5000',
    backgroundColor: '#f4f4f4',
    textColor: '#241d22',
    radius: 'md',
  },
  pages: [loginPage, ecommercePage],
}
