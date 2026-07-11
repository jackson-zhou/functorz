import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ecommercePage } from '@functorz/schema/fixtures'

const request = vi.fn()
vi.mock('@tarojs/taro', () => ({
  default: {
    ENV_TYPE: { WEAPP: 'WEAPP', WEB: 'WEB' },
    getEnv: () => 'WEB',
    request,
    showToast: vi.fn(),
    navigateTo: vi.fn(),
  },
}))

describe('flow runtime', () => {
  beforeEach(() => request.mockReset())

  it('requests tabs, kingkong, and products independently and writes each via setData', async () => {
    request
      .mockResolvedValueOnce({ data: { code: 0, data: ['关注', '推荐', '闪购'] } })
      .mockResolvedValueOnce({ data: { code: 0, data: [{ id: 'k1', label: '芭芭农场' }] } })
      .mockResolvedValueOnce({ data: { code: 0, data: [{ id: 'p1', name: '商品1' }] } })
    const { executeFlow } = await import('./flow-runtime.js')
    const writes: Array<[string, unknown]> = []
    await executeFlow(ecommercePage.root.events!.load!, {
      data: {},
      setData: (path, value) => writes.push([path, value]),
    })
    expect(request).toHaveBeenCalledTimes(3)
    expect(request).toHaveBeenNthCalledWith(1, expect.objectContaining({ url: '/api/home/tabs', method: 'GET' }))
    expect(request).toHaveBeenNthCalledWith(2, expect.objectContaining({ url: '/api/home/kingkong', method: 'GET' }))
    expect(request).toHaveBeenNthCalledWith(3, expect.objectContaining({ url: '/api/home/products', method: 'GET' }))
    expect(writes).toEqual([
      ['home.tabs', ['关注', '推荐', '闪购']],
      ['home.kingKong', [{ id: 'k1', label: '芭芭农场' }]],
      ['home.products', [{ id: 'p1', name: '商品1' }]],
    ])
  })

  it('skips setData and shows toast when an individual API fails', async () => {
    request
      .mockResolvedValueOnce({ data: { code: 0, data: ['关注', '推荐'] } })
      .mockResolvedValueOnce({ data: { code: -1, message: 'fail' } })
      .mockResolvedValueOnce({ data: { code: 0, data: [{ id: 'p1' }] } })
    const { executeFlow } = await import('./flow-runtime.js')
    const writes: Array<[string, unknown]> = []
    await executeFlow(ecommercePage.root.events!.load!, {
      data: {},
      setData: (path, value) => writes.push([path, value]),
    })
    // tabs success → write; kingkong fail → no write; products success → write
    expect(writes).toEqual([
      ['home.tabs', ['关注', '推荐']],
      ['home.products', [{ id: 'p1' }]],
    ])
  })
})
