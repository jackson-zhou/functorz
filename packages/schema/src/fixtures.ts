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
    { id: loginStart, type: 'start', label: '开始', position: { x: 50, y: 200 }, config: {} as Record<string, unknown> },
    { id: loginApi, type: 'api', label: '登录接口', position: { x: 200, y: 200 }, config: { url: '/api/login', method: 'POST' as const, body: '{\n  "phone": "{{phone}}",\n  "password": "{{password}}"\n}' } },
    { id: loginCondition, type: 'condition', label: '登录成功?', position: { x: 400, y: 200 }, config: { expression: 'response.code == 0 && response.msg contains "成功"' } },
    { id: loginNav, type: 'navigate', label: '跳转首页', position: { x: 620, y: 120 }, config: { pageId: ids.ecommerce } },
    { id: loginAlert, type: 'alert', label: '登录失败', position: { x: 620, y: 280 }, config: { type: 'error' as const, message: '账号或密码错误，请重新输入' } },
    { id: loginEndYes, type: 'end', label: '结束', position: { x: 820, y: 120 }, config: {} as Record<string, unknown> },
    { id: loginEndNo, type: 'end', label: '结束', position: { x: 820, y: 280 }, config: {} as Record<string, unknown> },
  ],
  edges: [
    { id: flowEdgeId(), source: loginStart, sourcePort: 'out', target: loginApi, targetPort: 'in', arrow: 'forward' },
    { id: flowEdgeId(), source: loginApi, sourcePort: 'out', target: loginCondition, targetPort: 'in', arrow: 'forward' },
    { id: flowEdgeId(), source: loginCondition, sourcePort: 'out', target: loginNav, targetPort: 'in', label: '是', arrow: 'forward' },
    { id: flowEdgeId(), source: loginCondition, sourcePort: 'outBottom', target: loginAlert, targetPort: 'in', label: '否', arrow: 'forward' },
    { id: flowEdgeId(), source: loginNav, sourcePort: 'out', target: loginEndYes, targetPort: 'in', arrow: 'forward' },
    { id: flowEdgeId(), source: loginAlert, sourcePort: 'out', target: loginEndNo, targetPort: 'in', arrow: 'forward' },
  ],
}

// 流程 2: 忘记密码 - 简单跳转
const forgotPasswordFlow: Flow = {
  nodes: [
    { id: flowNodeId(), type: 'start', label: '开始', position: { x: 50, y: 200 }, config: {} as Record<string, unknown> },
    { id: flowNodeId(), type: 'navigate', label: '忘记密码页', position: { x: 250, y: 200 }, config: { pageId: ids.login } },
    { id: flowNodeId(), type: 'end', label: '结束', position: { x: 450, y: 200 }, config: {} as Record<string, unknown> },
  ],
  edges: [
    { id: flowNodeId(), arrow: 'forward' },
    { id: flowNodeId(), arrow: 'forward' },
  ],
}

// 流程 3: 注册账号 - 简单跳转
const registerFlow: Flow = {
  nodes: [
    { id: flowNodeId(), type: 'start', label: '开始', position: { x: 50, y: 200 }, config: {} as Record<string, unknown> },
    { id: flowNodeId(), type: 'navigate', label: '注册页', position: { x: 250, y: 200 }, config: { pageId: ids.login } },
    { id: flowNodeId(), type: 'end', label: '结束', position: { x: 450, y: 200 }, config: {} as Record<string, unknown> },
  ],
  edges: [
    { id: flowNodeId(), arrow: 'forward' },
    { id: flowNodeId(), arrow: 'forward' },
  ],
}

// 流程 4: 商品卡片点击（含库存检查）- API + 条件
const productClickFlow: Flow = {
  nodes: [
    { id: flowNodeId(), type: 'start', label: '开始', position: { x: 50, y: 200 }, config: {} as Record<string, unknown> },
    { id: flowNodeId(), type: 'api', label: '查询库存', position: { x: 200, y: 200 }, config: { url: '/api/product/:id', method: 'GET' as const } },
    { id: flowNodeId(), type: 'condition', label: '库存>0?', position: { x: 400, y: 200 }, config: { expression: 'response.stock > 0' } },
    { id: flowNodeId(), type: 'navigate', label: '商品详情', position: { x: 620, y: 120 }, config: { pageId: ids.ecommerce } },
    { id: flowNodeId(), type: 'alert', label: '已售罄', position: { x: 620, y: 280 }, config: { type: 'info' as const, message: '该商品已售罄，敬请期待补货' } },
    { id: flowNodeId(), type: 'end', label: '结束', position: { x: 820, y: 120 }, config: {} as Record<string, unknown> },
    { id: flowNodeId(), type: 'end', label: '结束', position: { x: 820, y: 280 }, config: {} as Record<string, unknown> },
  ],
  edges: [
    { id: flowNodeId(), arrow: 'forward' },
    { id: flowNodeId(), arrow: 'forward' },
    { id: flowNodeId(), label: '是', arrow: 'forward' },
    { id: flowNodeId(), label: '否', arrow: 'forward' },
    { id: flowNodeId(), arrow: 'forward' },
    { id: flowNodeId(), arrow: 'forward' },
  ],
}

// 流程 5: 搜索栏点击（含空值校验）- 条件
const searchFlow: Flow = {
  nodes: [
    { id: flowNodeId(), type: 'start', label: '开始', position: { x: 50, y: 200 }, config: {} as Record<string, unknown> },
    { id: flowNodeId(), type: 'condition', label: '关键词非空?', position: { x: 250, y: 200 }, config: { expression: 'keyword != ""' } },
    { id: flowNodeId(), type: 'navigate', label: '搜索结果', position: { x: 470, y: 120 }, config: { pageId: ids.ecommerce } },
    { id: flowNodeId(), type: 'alert', label: '请输入关键词', position: { x: 470, y: 280 }, config: { type: 'info' as const, message: '请输入搜索关键词' } },
    { id: flowNodeId(), type: 'end', label: '结束', position: { x: 670, y: 120 }, config: {} as Record<string, unknown> },
    { id: flowNodeId(), type: 'end', label: '结束', position: { x: 670, y: 280 }, config: {} as Record<string, unknown> },
  ],
  edges: [
    { id: flowNodeId(), arrow: 'forward' },
    { id: flowNodeId(), label: '是', arrow: 'forward' },
    { id: flowNodeId(), label: '否', arrow: 'forward' },
    { id: flowNodeId(), arrow: 'forward' },
    { id: flowNodeId(), arrow: 'forward' },
  ],
}

// 流程 6: Banner 轮播点击 - 简单跳转
const bannerFlow: Flow = {
  nodes: [
    { id: flowNodeId(), type: 'start', label: '开始', position: { x: 50, y: 200 }, config: {} as Record<string, unknown> },
    { id: flowNodeId(), type: 'navigate', label: '活动详情页', position: { x: 250, y: 200 }, config: { pageId: ids.ecommerce } },
    { id: flowNodeId(), type: 'end', label: '结束', position: { x: 450, y: 200 }, config: {} as Record<string, unknown> },
  ],
  edges: [
    { id: flowNodeId(), arrow: 'forward' },
    { id: flowNodeId(), arrow: 'forward' },
  ],
}

// 流程 7: 底部导航切换（含登录校验）- 条件 + 两个 navigate
const navFlow: Flow = {
  nodes: [
    { id: flowNodeId(), type: 'start', label: '开始', position: { x: 50, y: 200 }, config: {} as Record<string, unknown> },
    { id: flowNodeId(), type: 'condition', label: '已登录?', position: { x: 250, y: 200 }, config: { expression: 'isLogin == true' } },
    { id: flowNodeId(), type: 'navigate', label: '对应页面', position: { x: 470, y: 120 }, config: { pageId: ids.ecommerce } },
    { id: flowNodeId(), type: 'navigate', label: '登录页', position: { x: 470, y: 280 }, config: { pageId: ids.login } },
    { id: flowNodeId(), type: 'end', label: '结束', position: { x: 670, y: 120 }, config: {} as Record<string, unknown> },
    { id: flowNodeId(), type: 'end', label: '结束', position: { x: 670, y: 280 }, config: {} as Record<string, unknown> },
  ],
  edges: [
    { id: flowNodeId(), arrow: 'forward' },
    { id: flowNodeId(), label: '是', arrow: 'forward' },
    { id: flowNodeId(), label: '否', arrow: 'forward' },
    { id: flowNodeId(), arrow: 'forward' },
    { id: flowNodeId(), arrow: 'forward' },
  ],
}

// 流程 8: 首页加载（页面级 load 事件）- API + 条件 + setData
const pageLoadFlow: Flow = {
  nodes: [
    { id: flowNodeId(), type: 'start', label: '开始', position: { x: 50, y: 200 }, config: {} as Record<string, unknown> },
    { id: flowNodeId(), type: 'api', label: '获取商品列表', position: { x: 200, y: 200 }, config: { url: '/api/products', method: 'GET' as const } },
    { id: flowNodeId(), type: 'condition', label: '请求成功?', position: { x: 400, y: 200 }, config: { expression: 'response.code == 0' } },
    { id: flowNodeId(), type: 'setData', label: '填充商品数据', position: { x: 620, y: 120 }, config: { target: 'productList', source: 'response.data.products' } },
    { id: flowNodeId(), type: 'alert', label: '加载失败', position: { x: 620, y: 280 }, config: { type: 'error' as const, message: '数据加载失败，请稍后重试' } },
    { id: flowNodeId(), type: 'end', label: '结束', position: { x: 820, y: 120 }, config: {} as Record<string, unknown> },
    { id: flowNodeId(), type: 'end', label: '结束', position: { x: 820, y: 280 }, config: {} as Record<string, unknown> },
  ],
  edges: [
    { id: flowNodeId(), arrow: 'forward' },
    { id: flowNodeId(), arrow: 'forward' },
    { id: flowNodeId(), label: '是', arrow: 'forward' },
    { id: flowNodeId(), label: '否', arrow: 'forward' },
    { id: flowNodeId(), arrow: 'forward' },
    { id: flowNodeId(), arrow: 'forward' },
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
          node('Button', { text: '登录', variant: 'primary' }, [], { marginTop: 16 }, { tap: loginFlow }),
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
      { paddingLeft: 32, paddingRight: 32, gap: 'sm' },
    ),
  ]),
}

// ============ 金刚位项目（带占位图标） ============
const kingKongItem = (icon: string, text: string, color: string) =>
  node('Flex', { direction: 'column', alignItems: 'center' }, [
    node(
      'Flex',
      { direction: 'row', alignItems: 'center', justifyContent: 'center' },
      [node('Text', { text: icon }, [], { fontSize: 'lg', color: '#ffffff', fontWeight: 'bold' })],
      { width: 48, height: 48, radius: 'lg', backgroundColor: color },
    ),
    node('Text', { text }, [], { fontSize: 'xs', color: '#29242a', fontWeight: 'medium', textAlign: 'center' }),
  ], { gap: 'xs', paddingTop: 6, paddingBottom: 6 })

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

const activityCard = (title: string, subtitle: string, price: string, image: string) =>
  node('Flex', { direction: 'column' }, [
    node('Text', { text: title }, [], { fontSize: 'sm', fontWeight: 'bold', color: '#241d22' }),
    node('Text', { text: subtitle }, [], { fontSize: 'xs', color: '#ff5000', fontWeight: 'semibold' }),
    node('Image', { src: image, alt: title }, [], { width: 104, height: 82, objectFit: 'cover', radius: 'md' }),
    node('Text', { text: price }, [], { fontSize: 'md', fontWeight: 'bold', color: '#ff3b20' }),
  ], {
    gap: 'xs', overflow: 'hidden', radius: 'md', backgroundColor: '#fff7f3',
    paddingTop: 10, paddingRight: 8, paddingBottom: 8, paddingLeft: 8,
  })

// ============ 电商首页（淘宝风格） ============
export const ecommercePage: PageSchema = {
  id: ids.ecommerce,
  name: '电商首页',
  route: '/pages/home',
  root: node('Page', {}, [
    // 顶部状态栏占位
    // 顶部导航栏
    node(
      'Flex',
      { direction: 'row', alignItems: 'center' },
      [
        node('Text', { text: '关注' }, [], { fontSize: 'sm', color: '#4b4048', fontWeight: 'medium' }),
        node(
          'Flex',
          { direction: 'column', alignItems: 'center' },
          [
            node('Text', { text: '推荐' }, [], { fontSize: 'lg', fontWeight: 'bold', color: '#ff5000' }),
            node('Text', { text: '━' }, [], { fontSize: 'sm', fontWeight: 'bold', color: '#ff5000' }),
          ],
          { gap: 'none', backgroundColor: '#ffffff', radius: 'md', paddingTop: 8, paddingRight: 10, paddingLeft: 10 },
        ),
        node('Text', { text: '闪购' }, [], { fontSize: 'sm', color: '#3a3038', fontWeight: 'semibold' }),
        node('Text', { text: '国补' }, [], { fontSize: 'sm', color: '#3a3038', fontWeight: 'semibold' }),
        node('Text', { text: '飞猪' }, [], { fontSize: 'sm', color: '#3a3038', fontWeight: 'semibold' }),
        node('Text', { text: '立减' }, [], { fontSize: 'sm', color: '#3a3038', fontWeight: 'semibold' }),
      ],
      { gap: 'md', overflow: 'hidden', paddingLeft: 14, paddingRight: 8, paddingTop: 4, paddingBottom: 6 },
    ),
    // 搜索栏
    node(
      'Section',
      {},
      [
        node('SearchBar', { placeholder: '千本樱', showButton: true, buttonText: '搜索' }, [], {}, { tap: searchFlow }),
      ],
      { paddingLeft: 10, paddingRight: 10, paddingBottom: 8 },
    ),
    // 金刚位入口（带占位图标）
    node(
      'Section',
      {},
      [
        node(
          'Grid',
          { columns: 5 },
          [
            kingKongItem('树', '芭芭农场', '#16c875'),
            kingKongItem('淘', '淘工厂', '#ff5035'),
            kingKongItem('币', '领淘金币', '#ffbd22'),
            kingKongItem('市', '天猫超市', '#47cc2e'),
            kingKongItem('¥', '红包签到', '#f13b42'),
          ],
          { gap: 'xs' },
        ),
      ],
      { backgroundColor: '#ffffff', paddingTop: 4, paddingRight: 8, paddingBottom: 8, paddingLeft: 8 },
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
      { gap: 'sm', paddingLeft: 10, paddingRight: 10, paddingBottom: 10 },
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
        ], { width: 125, backgroundColor: '#ffffff', radius: 'sm', paddingTop: 10, paddingRight: 6, paddingBottom: 10, paddingLeft: 6 }),
      ],
      { backgroundColor: '#ff2c16', radius: 'md', paddingTop: 9, paddingRight: 8, paddingBottom: 9, paddingLeft: 12, marginLeft: 10, marginRight: 10 },
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
      { paddingLeft: 12, paddingRight: 12, paddingTop: 14, paddingBottom: 8 },
    ),
    // 商品网格（带占位数据）
    node(
      'Grid',
      { columns: 2 },
      [
        node('ProductCard', {
          name: '专业训练乒乓球拍套装 高弹底板横直拍可选',
          price: '1199',
          originalPrice: '1999',
          image: placeholderImage('运动好物', '#7c96a7', '#273944'),
          tag: '天猫 立减10%',
          sales: '100+',
        }, [], {}, { tap: productClickFlow }),
        node('ProductCard', {
          name: '高颜值透明无线蓝牙耳机 超长续航入耳式',
          price: '108',
          originalPrice: '199',
          image: placeholderImage('数码好物', '#9dc2d4', '#446879'),
          tag: '天猫 券后价',
          sales: '6000+',
        }, [], {}, { tap: productClickFlow }),
        node('ProductCard', {
          name: '机械键盘 RGB背光青轴',
          price: '159',
          originalPrice: '299',
          image: placeholderImage('电脑配件', '#9d82bc', '#4b3866'),
          tag: '秒杀',
          sales: '2345',
        }, [], {}, { tap: productClickFlow }),
        node('ProductCard', {
          name: '便携充电宝 20000mAh',
          price: '79',
          originalPrice: '129',
          image: placeholderImage('出行必备', '#f0aa7b', '#9d4e34'),
          tag: '包邮',
          sales: '4567',
        }, [], {}, { tap: productClickFlow }),
      ],
      { gap: 'sm', paddingLeft: 10, paddingRight: 10 },
    ),
    // 底部导航
    node('BottomNav', {
      items: '["首页","逛逛","消息","购物车","我的淘宝"]',
      activeIndex: 0,
    }, [], { position: 'fixed', bottom: 0, width: 390, zIndex: 999, backgroundColor: '#ffffff' }, { tap: navFlow }),
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
                'Text',
                { text: gender === 'male' ? '♂' : '♀' },
                [],
                {
                  position: 'absolute', top: 0, left: 0, width: 19, height: 19,
                  color: '#ffffff', backgroundColor: gender === 'male' ? '#6395ef' : '#f06d76',
                  textAlign: 'center', fontWeight: 'bold',
                },
              ),
            ],
            { position: 'relative', width: 69, height: 69 },
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
        { gap: 'md', paddingTop: 15, paddingRight: 15, paddingBottom: 15, paddingLeft: 15 },
      ),
      node('Divider'),
      node(
        'Flex',
        { direction: 'row', justifyContent: 'flex-end', alignItems: 'center' },
        [petAction('登录'), petAction('复制'), petAction('修改')],
        { gap: 'md', paddingTop: 4, paddingRight: 12, paddingBottom: 4, paddingLeft: 12 },
      ),
    ],
    { backgroundColor: '#f4f5f7', overflow: 'hidden', marginBottom: 18 },
  )

const navItem = (icon: string, label: string, active = false) =>
  node(
    'Flex',
    { direction: 'column', alignItems: 'center', justifyContent: 'center' },
    [
      node('Text', { text: icon }, [], { fontSize: 'lg', color: active ? '#222222' : '#999999', textAlign: 'center' }),
      ...(label ? [node('Text', { text: label }, [], { fontSize: 'xs', color: active ? '#222222' : '#999999', fontWeight: active ? 'bold' : 'normal' })] : []),
    ],
    { flex: 1 },
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
      { height: 64, paddingRight: 16, paddingLeft: 16 },
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
      'Flex',
      { direction: 'column', alignItems: 'center', justifyContent: 'center' },
      [node('Text', { text: '+' }, [], { fontSize: 'xl', fontWeight: 'bold' }), node('Text', { text: '添加' }, [], { fontSize: 'xs', fontWeight: 'bold' })],
      { position: 'fixed', right: 16, bottom: 68, zIndex: 100, width: 62, height: 62, backgroundColor: '#f0b557', color: '#3b3020' },
    ),
    node(
      'Flex',
      { direction: 'row', alignItems: 'center' },
      [navItem('▤', '消息'), navItem('♧', '活体', true), navItem('+', ''), navItem('♧', '繁育'), navItem('⌣', '我的')],
      { position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 90, height: 57, borderWidth: 1, borderColor: '#e4e4e4', backgroundColor: '#ffffff' },
    ),
  ]),
}

export const demoProject: ProjectSchema = {
  version: 1,
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
