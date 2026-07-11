import Taro from '@tarojs/taro'
import type { Flow, FlowNode } from '@functorz/schema'
import { evaluateCondition, getPath, setPath, type RuntimeData } from './flow-utils.js'
export { evaluateCondition, getPath, setPath } from './flow-utils.js'
export type { RuntimeData } from './flow-utils.js'

declare const process: { env?: Record<string, string | undefined> } | undefined

function apiUrl(url: string): string {
  if (!url.startsWith('/')) return url
  if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) return url
  const base = typeof process !== 'undefined' ? process.env?.TARO_APP_API_BASE_URL : undefined
  if (!base) throw new Error('TARO_APP_API_BASE_URL is required for WeChat Mini Program requests')
  return `${base.replace(/\/$/, '')}${url}`
}

function nextNode(flow: Flow, node: FlowNode, condition?: boolean): FlowNode | undefined {
  const candidates = flow.edges.filter((edge) => edge.source === node.id && edge.target)
  const selected = node.type === 'condition'
    ? candidates.find((edge) => condition
      ? ['yes', 'true'].includes(String(edge.label).toLowerCase())
      : ['no', 'false'].includes(String(edge.label).toLowerCase()))
    : candidates[0]
  return selected?.target ? flow.nodes.find((item) => item.id === selected.target) : undefined
}

export interface FlowExecutionOptions {
  data: RuntimeData
  setData: (path: string, value: unknown) => void
  signal?: AbortSignal
}

export async function executeFlow(flow: Flow, options: FlowExecutionOptions): Promise<void> {
  let current = flow.nodes.find((node) => node.type === 'start')
  const scope: RuntimeData = { ...options.data }
  let steps = 0
  while (current && current.type !== 'end') {
    if (options.signal?.aborted) return
    if (++steps > 100) throw new Error('Flow exceeded 100 steps')
    let condition: boolean | undefined
    const config = current.config as Record<string, unknown>
    if (current.type === 'api') {
      try {
        const body = typeof config.body === 'string' && config.body.trim()
          ? JSON.parse(config.body)
          : undefined
        const response = await Taro.request({
          url: apiUrl(String(config.url ?? '')),
          method: String(config.method ?? 'GET') as 'GET' | 'POST',
          data: body,
          timeout: 10_000,
        })
        scope.response = response.data
      } catch (error) {
        scope.response = { code: -1, message: error instanceof Error ? error.message : 'Request failed' }
      }
    } else if (current.type === 'condition') {
      condition = evaluateCondition(String(config.expression ?? ''), scope)
    } else if (current.type === 'setData') {
      const target = String(config.target ?? '')
      const value = getPath(scope, String(config.source ?? ''))
      options.setData(target, value)
      Object.assign(scope, setPath(scope, target, value))
    } else if (current.type === 'alert') {
      await Taro.showToast({
        title: String(config.message ?? ''),
        icon: config.type === 'success' ? 'success' : 'none',
      })
    } else if (current.type === 'navigate') {
      const pageId = String(config.pageId ?? '')
      if (pageId) await Taro.navigateTo({ url: `/pages/index/index?pageId=${pageId}` })
    }
    current = nextNode(flow, current, condition)
  }
}
