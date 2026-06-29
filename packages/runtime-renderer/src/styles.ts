import type { CSSProperties } from 'react'
import type { ComponentNode } from '@functorz/schema'
export const sizes = { none: 0, xs: 4, sm: 8, md: 16, lg: 24, xl: 36 }
const fonts = { xs: 12, sm: 14, md: 16, lg: 20, xl: 28 }
const radii = { none: 0, sm: 4, md: 10, lg: 18, pill: 999 }
export function tokenStyle(node: ComponentNode): CSSProperties {
  const s = node.style ?? {}
  return {
    color: s.color,
    backgroundColor: s.backgroundColor,
    fontSize: s.fontSize ? fonts[s.fontSize] : undefined,
    padding: s.spacing ? sizes[s.spacing] : undefined,
    borderRadius: s.radius ? radii[s.radius] : undefined,
    gap: s.gap ? sizes[s.gap] : undefined,
    alignItems: s.align,
    gridTemplateColumns: s.columns ? `repeat(${s.columns}, minmax(0, 1fr))` : undefined,
  }
}
