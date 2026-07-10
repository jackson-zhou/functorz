import type { CSSProperties } from 'react'
import type { ComponentNode } from '@functorz/schema'
export const sizes = { none: 0, xs: 4, sm: 8, md: 16, lg: 24, xl: 36 }
const fonts = { xs: 12, sm: 14, md: 16, lg: 20, xl: 28 }
const radii = { none: 0, sm: 4, md: 10, lg: 18, pill: 999 }
export function tokenStyle(node: ComponentNode): CSSProperties {
  const s = node.style ?? {}
  const columns = (node.props?.columns as number) || s.columns
  return {
    color: s.color,
    backgroundColor: s.backgroundColor,
    fontSize: s.fontSize ? fonts[s.fontSize] : undefined,
    padding: s.spacing ? sizes[s.spacing] : undefined,
    borderRadius: s.radius ? radii[s.radius] : undefined,
    gap: s.gap ? sizes[s.gap] : undefined,
    alignItems: s.align,
    gridTemplateColumns: columns ? `repeat(${columns}, minmax(0, 1fr))` : undefined,
    width: s.width,
    height: s.height,
    minHeight: s.minHeight,
    flex: s.flex,
    paddingTop: s.paddingTop,
    paddingRight: s.paddingRight,
    paddingBottom: s.paddingBottom,
    paddingLeft: s.paddingLeft,
    marginTop: s.marginTop,
    marginRight: s.marginRight,
    marginBottom: s.marginBottom,
    marginLeft: s.marginLeft,
    borderWidth: s.borderWidth,
    borderColor: s.borderColor,
    borderStyle: s.borderWidth ? 'solid' : undefined,
    position: s.position,
    top: s.top,
    right: s.right,
    bottom: s.bottom,
    left: s.left,
    zIndex: s.zIndex,
    overflow: s.overflow,
    fontWeight: s.fontWeight === 'medium' ? 500 : s.fontWeight === 'semibold' ? 600 : s.fontWeight,
    textAlign: s.textAlign,
    objectFit: s.objectFit,
  }
}
