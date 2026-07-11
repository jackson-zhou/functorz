export type RuntimeData = Record<string, unknown>

export function getPath(value: unknown, path: string): unknown {
  if (!path) return value
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[key]
  }, value)
}

export function setPath(data: RuntimeData, path: string, value: unknown): RuntimeData {
  const keys = path.split('.').filter(Boolean)
  if (!keys.length || keys.some((key) => ['__proto__', 'prototype', 'constructor'].includes(key)))
    throw new Error('Invalid data target')
  const next: RuntimeData = { ...data }
  let cursor: Record<string, unknown> = next
  let source: Record<string, unknown> = data
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value
      return
    }
    const child = source[key]
    cursor[key] = child && typeof child === 'object' && !Array.isArray(child)
      ? { ...(child as Record<string, unknown>) }
      : {}
    cursor = cursor[key] as Record<string, unknown>
    source = child && typeof child === 'object' && !Array.isArray(child)
      ? child as Record<string, unknown>
      : {}
  })
  return next
}

function literal(value: string): unknown {
  const trimmed = value.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null') return null
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
  return trimmed.replace(/^['"]|['"]$/g, '')
}

export function evaluateCondition(expression: string, scope: RuntimeData): boolean {
  const evaluateAtom = (atom: string) => {
    const match = atom.trim().match(/^([a-zA-Z_$][\w.$]*)\s*(==|!=|>=|<=|>|<|contains)\s*(.+)$/)
    if (!match) return Boolean(getPath(scope, atom.trim()))
    const left = getPath(scope, match[1]!)
    const right = literal(match[3]!)
    switch (match[2]) {
      case '==': return left === right
      case '!=': return left !== right
      case '>=': return Number(left) >= Number(right)
      case '<=': return Number(left) <= Number(right)
      case '>': return Number(left) > Number(right)
      case '<': return Number(left) < Number(right)
      case 'contains': return String(left ?? '').includes(String(right))
      default: return false
    }
  }
  return expression.split('||').some((orPart) => orPart.split('&&').every(evaluateAtom))
}
