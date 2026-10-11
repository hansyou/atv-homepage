import { Hono } from 'hono'
import type { Bindings } from '../types'
import { requireAuth } from '../lib/auth'
import { asId, asObject, asOrder, fail } from '../lib/validate'

const reorder = new Hono<{ Bindings: Bindings }>()

reorder.use('*', requireAuth)

interface OrderItem {
  id: string
  sort_order: number
  folder_id?: string | null
}

function parseItems(value: unknown, field: string): OrderItem[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) fail(`字段 ${field} 必须是数组`)
  return value.map((raw) => {
    const item = asObject(raw)
    const out: OrderItem = {
      id: asId(item.id, `${field}.id`),
      sort_order: asOrder(item.sort_order, `${field}.sort_order`),
    }
    if (item.folder_id !== undefined) out.folder_id = item.folder_id ? asId(item.folder_id, `${field}.folder_id`) : null
    return out
  })
}

/** 批量提交 links / folders 的新顺序（也可用于把网址移入/移出文件夹） */
reorder.patch('/', async (c) => {
  const body = asObject(await c.req.json().catch(() => null))
  const linkItems = parseItems(body.links, 'links')
  const folderItems = parseItems(body.folders, 'folders')

  const stmts: D1PreparedStatement[] = []
  const now = Date.now()

  for (const item of linkItems) {
    if (item.folder_id === undefined) {
      stmts.push(c.env.DB.prepare('UPDATE links SET sort_order = ?, updated_at = ? WHERE id = ?').bind(item.sort_order, now, item.id))
    } else {
      stmts.push(
        c.env.DB
          .prepare('UPDATE links SET sort_order = ?, folder_id = ?, updated_at = ? WHERE id = ?')
          .bind(item.sort_order, item.folder_id, now, item.id),
      )
    }
  }
  for (const item of folderItems) {
    stmts.push(c.env.DB.prepare('UPDATE folders SET sort_order = ? WHERE id = ?').bind(item.sort_order, item.id))
  }

  if (stmts.length > 0) await c.env.DB.batch(stmts)
  return c.json({ ok: true, updated: stmts.length })
})

export default reorder
