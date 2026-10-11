import { Hono } from 'hono'
import type { Bindings } from '../types'
import { requireAuth } from '../lib/auth'
import { asHttpUrl, asObject, asString, fail } from '../lib/validate'

const settings = new Hono<{ Bindings: Bindings }>()

settings.use('*', requireAuth)

/** 允许公开编辑的站点设置项 */
const ALLOWED_KEYS = new Set(['tagline', 'show_clock', 'wallpaper_url'])

const DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/]+={0,2}$/

/** 背景壁纸：站内图片路径、图片链接，或本地上传转成的 data URL */
function asWallpaper(value: unknown): string {
  const raw = asString(value, 'wallpaper_url', { max: 1_500_000, required: false })
  if (!raw) return ''
  if (raw.startsWith('data:')) {
    if (!DATA_URL_RE.test(raw)) fail('背景图数据格式不正确，请上传图片文件')
    return raw
  }
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  return asHttpUrl(raw, 'wallpaper_url')
}

settings.post('/', async (c) => {
  const body = asObject(await c.req.json().catch(() => null))
  const input = asObject(body.settings ?? body)
  const entries: [string, string][] = []

  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_KEYS.has(key)) fail(`不支持的设置项：${key}`)
    entries.push([key, key === 'wallpaper_url' ? asWallpaper(value) : asString(value, key, { max: 200, required: false })])
  }
  if (entries.length === 0) fail('没有需要更新的设置')

  await c.env.DB.batch(
    entries.map(([key, value]) =>
      c.env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(key, value),
    ),
  )

  return c.json({ ok: true })
})

export default settings
