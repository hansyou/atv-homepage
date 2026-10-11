import { Hono } from 'hono'
import type { Bindings, FolderRow } from '../types'
import { requireAuth } from '../lib/auth'
import { asId, asObject, asOrder, asString, fail, newId } from '../lib/validate'

const folders = new Hono<{ Bindings: Bindings }>()

folders.use('*', requireAuth)

const COLOR_RE = /^#[0-9a-fA-F]{3,8}$/

async function findFolder(db: D1Database, id: string): Promise<FolderRow> {
  const row = await db.prepare('SELECT * FROM folders WHERE id = ?').bind(id).first<FolderRow>()
  if (!row) fail('文件夹不存在')
  return row as FolderRow
}

function parseColor(value: unknown): string {
  const raw = asString(value, 'color', { max: 16, required: false }) || '#6366f1'
  if (!COLOR_RE.test(raw)) fail('color 必须是十六进制颜色值')
  return raw
}

folders.post('/', async (c) => {
  const body = asObject(await c.req.json().catch(() => null))
  const name = asString(body.name, 'name', { max: 40 })
  const color = parseColor(body.color)
  const now = Date.now()
  const id = newId()
  const max = await c.env.DB.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM folders').first<{ m: number }>()
  const sortOrder = body.sort_order === undefined ? (max?.m ?? -1) + 1 : asOrder(body.sort_order, 'sort_order')

  await c.env.DB
    .prepare('INSERT INTO folders (id, name, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, name, color, sortOrder, now)
    .run()

  return c.json({ folder: await findFolder(c.env.DB, id) }, 201)
})

folders.patch('/:id', async (c) => {
  const id = asId(c.req.param('id'))
  const existing = await findFolder(c.env.DB, id)
  const body = asObject(await c.req.json().catch(() => null))

  const name = body.name === undefined ? existing.name : asString(body.name, 'name', { max: 40 })
  const color = body.color === undefined ? existing.color : parseColor(body.color)
  const sortOrder = body.sort_order === undefined ? existing.sort_order : asOrder(body.sort_order, 'sort_order')

  await c.env.DB.prepare('UPDATE folders SET name = ?, color = ?, sort_order = ? WHERE id = ?').bind(name, color, sortOrder, id).run()
  return c.json({ folder: await findFolder(c.env.DB, id) })
})

folders.delete('/:id', async (c) => {
  const id = asId(c.req.param('id'))
  await findFolder(c.env.DB, id)
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE links SET folder_id = NULL, updated_at = ? WHERE folder_id = ?').bind(Date.now(), id),
    c.env.DB.prepare('DELETE FROM folders WHERE id = ?').bind(id),
  ])
  return c.json({ ok: true })
})

export default folders
