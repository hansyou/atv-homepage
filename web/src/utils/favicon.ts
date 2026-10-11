import type { Link } from '../api/types'

/** 图标地址：只使用手动配置的图标链接 */
export function faviconSrc(link: Pick<Link, 'icon'>): string {
  return link.icon || ''
}

/** 占位文字：标题首字（字母或汉字） */
export function firstGlyph(title: string): string {
  const trimmed = (title || '?').trim()
  return trimmed.slice(0, 1).toUpperCase()
}

/** 由文本派生稳定的色相，用于占位图配色 */
function hueOf(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) % 360
  return hash
}

export function placeholderStyle(text: string): Record<string, string> {
  const hue = hueOf(text)
  return {
    background: `linear-gradient(145deg, hsl(${hue} 62% 42%), hsl(${(hue + 42) % 360} 58% 28%))`,
  }
}
