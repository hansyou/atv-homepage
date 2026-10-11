import { Hono } from 'hono'
import type { Bindings } from './types'
import { ValidationError } from './lib/validate'
import { isAuthenticated } from './lib/auth'
import authRoutes from './routes/auth'
import linkRoutes from './routes/links'
import folderRoutes from './routes/folders'
import reorderRoutes from './routes/reorder'
import backupRoutes from './routes/backup'
import settingsRoutes from './routes/settings'

const api = new Hono<{ Bindings: Bindings }>()

/** 公开：一次性取回浏览所需数据 */
api.get('/bootstrap', async (c) => {
  const [links, folders, settings, authed] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order').all(),
    c.env.DB.prepare('SELECT * FROM folders ORDER BY sort_order').all(),
    c.env.DB.prepare('SELECT * FROM settings').all(),
    isAuthenticated(c),
  ])

  const settingsMap: Record<string, string> = {}
  for (const row of settings.results as { key: string; value: string }[]) settingsMap[row.key] = row.value

  return c.json({
    links: links.results,
    folders: folders.results,
    settings: settingsMap,
    authed,
  })
})

api.route('/auth', authRoutes)
api.route('/links', linkRoutes)
api.route('/folders', folderRoutes)
api.route('/reorder', reorderRoutes)
api.route('/backup', backupRoutes)
api.route('/settings', settingsRoutes)

api.all('/*', (c) => c.json({ error: 'not found' }, 404))

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', async (c, next) => {
  await next()
  c.header('X-Frame-Options', 'DENY')
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'no-referrer')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
})

app.onError((err, c) => {
  if (err instanceof ValidationError) return c.json({ error: err.message }, 400)
  console.error(err)
  return c.json({ error: 'internal error' }, 500)
})

app.route('/api', api)

// 其余请求交给静态资源（SPA fallback 由 assets 配置处理）
app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
