import { Hono } from 'hono'
import type { Bindings, LinkRow } from '../types'
import { requireAuth } from '../lib/auth'
import { asBoolean, asHttpUrl, asIconUrl, asId, asObject, asOrder, asString, fail, newId } from '../lib/validate'

const MAX_PINNED = 5
const links = new Hono<{ Bindings: Bindings }>()

links.use('*', requireAuth)

async function findLink(db: D1Database, id: string): Promise<LinkRow> {
  const row = await db.prepare('SELECT * FROM links WHERE id = ?').bind(id).first<LinkRow>()
  if (!row) fail('网址不存在')
  return row as LinkRow
}

async function assertFolderExists(db: D1Database, folderId: string | null): Promise<void> {
  if (!folderId) return
  const row = await db.prepare('SELECT id FROM folders WHERE id = ?').bind(folderId).first()
  if (!row) fail('文件夹不存在')
}

async function assertPinnedQuota(db: D1Database, excludeId: string | null, pinned: boolean): Promise<void> {
  if (!pinned) return
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM links WHERE is_pinned = 1 AND id != ?')
    .bind(excludeId ?? '')
    .first<{ n: number }>()
  if ((row?.n ?? 0) >= MAX_PINNED) fail(`首页快捷位最多 ${MAX_PINNED} 个`)
}

links.post('/', async (c) => {
  const body = asObject(await c.req.json().catch(() => null))
  const title = asString(body.title, 'title', { max: 80 })
  const url = asHttpUrl(body.url, 'url')
  const icon = asIconUrl(body.icon, 'icon')
  const folderId = body.folder_id ? asId(body.folder_id, 'folder_id') : null
  const pinned = asBoolean(body.is_pinned, 'is_pinned')
  await assertFolderExists(c.env.DB, folderId)
  await assertPinnedQuota(c.env.DB, null, pinned)

  const now = Date.now()
  const id = newId()
  const max = await c.env.DB.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM links').first<{ m: number }>()
  const sortOrder = body.sort_order === undefined ? (max?.m ?? -1) + 1 : asOrder(body.sort_order, 'sort_order')

  await c.env.DB
    .prepare(
      `INSERT INTO links (id, title, url, icon, folder_id, sort_order, is_pinned, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, title, url, icon || null, folderId, sortOrder, pinned ? 1 : 0, now, now)
    .run()

  return c.json({ link: await findLink(c.env.DB, id) }, 201)
})

links.patch('/:id', async (c) => {
  const id = asId(c.req.param('id'))
  const existing = await findLink(c.env.DB, id)
  const body = asObject(await c.req.json().catch(() => null))

  const title = body.title === undefined ? existing.title : asString(body.title, 'title', { max: 80 })
  const url = body.url === undefined ? existing.url : asHttpUrl(body.url, 'url')
  const icon = body.icon === undefined ? existing.icon || '' : asIconUrl(body.icon, 'icon')
  const folderId =
    body.folder_id === undefined ? existing.folder_id : body.folder_id ? asId(body.folder_id, 'folder_id') : null
  const pinned = body.is_pinned === undefined ? existing.is_pinned === 1 : asBoolean(body.is_pinned, 'is_pinned')
  const sortOrder = body.sort_order === undefined ? existing.sort_order : asOrder(body.sort_order, 'sort_order')

  await assertFolderExists(c.env.DB, folderId)
  await assertPinnedQuota(c.env.DB, id, pinned)

  await c.env.DB
    .prepare(
      `UPDATE links SET title = ?, url = ?, icon = ?, folder_id = ?, is_pinned = ?, sort_order = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(title, url, icon || null, folderId, pinned ? 1 : 0, sortOrder, Date.now(), id)
    .run()

  return c.json({ link: await findLink(c.env.DB, id) })
})

links.delete('/:id', async (c) => {
  const id = asId(c.req.param('id'))
  await findLink(c.env.DB, id)
  await c.env.DB.prepare('DELETE FROM links WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

export default links
