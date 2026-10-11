import { Hono } from 'hono'
import type { BackupFile, Bindings, FolderRow, LinkRow } from '../types'
import { requireAuth } from '../lib/auth'
import {
  asHttpUrl,
  asIconUrl,
  asLooseBoolean,
  asObject,
  asOrder,
  asString,
  fail,
  newId,
} from '../lib/validate'

const backup = new Hono<{ Bindings: Bindings }>()

backup.use('*', requireAuth)

const BACKUP_VERSION = 1

function parseLink(raw: unknown, index: number): LinkRow {
  const item = asObject(raw)
  const now = Date.now()
  return {
    id: item.id ? asString(item.id, `links[${index}].id`, { max: 64 }) : newId(),
    title: asString(item.title, `links[${index}].title`, { max: 80 }),
    url: asHttpUrl(item.url, `links[${index}].url`),
    icon: asIconUrl(item.icon, `links[${index}].icon`) || null,
    folder_id: item.folder_id ? asString(item.folder_id, `links[${index}].folder_id`, { max: 64 }) : null,
    sort_order: asOrder(item.sort_order, `links[${index}].sort_order`, index),
    is_pinned: asLooseBoolean(item.is_pinned, `links[${index}].is_pinned`) ? 1 : 0,
    created_at: asOrder(item.created_at, `links[${index}].created_at`, now),
    updated_at: asOrder(item.updated_at, `links[${index}].updated_at`, now),
  }
}

function parseFolder(raw: unknown, index: number): FolderRow {
  const item = asObject(raw)
  return {
    id: item.id ? asString(item.id, `folders[${index}].id`, { max: 64 }) : newId(),
    name: asString(item.name, `folders[${index}].name`, { max: 40 }),
    color: asString(item.color, `folders[${index}].color`, { max: 16, required: false }) || '#6366f1',
    sort_order: asOrder(item.sort_order, `folders[${index}].sort_order`, index),
    created_at: asOrder(item.created_at, `folders[${index}].created_at`, Date.now()),
  }
}

function parseSetting(raw: unknown, index: number): { key: string; value: string } {
  const item = asObject(raw)
  const key = asString(item.key, `settings[${index}].key`, { max: 64 })
  // 壁纸可能是大体积 data URL，单独放宽上限
  const max = key === 'wallpaper_url' ? 1_500_000 : 4000
  return { key, value: asString(item.value, `settings[${index}].value`, { max, required: false }) }
}

backup.get('/', async (c) => {
  const [links, folders, settings] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order'),
    c.env.DB.prepare('SELECT * FROM folders ORDER BY sort_order'),
    c.env.DB.prepare('SELECT * FROM settings'),
  ])

  const payload: BackupFile = {
    app: 'atv-homepage',
    version: BACKUP_VERSION,
    exported_at: Date.now(),
    data: {
      links: links.results as LinkRow[],
      folders: folders.results as FolderRow[],
      settings: settings.results as { key: string; value: string }[],
    },
  }
  return c.json(payload)
})

/** 校验备份文件；失败抛 ValidationError，绝不写库 */
function normalizeBackup(raw: unknown): BackupFile {
  const body = asObject(raw)
  if (body.app !== 'atv-homepage') fail('备份文件格式不正确（app 字段不匹配）')
  if (body.version !== BACKUP_VERSION) fail(`不支持的备份版本：${String(body.version)}`)
  const data = asObject(body.data)
  if (!Array.isArray(data.links) || !Array.isArray(data.folders) || !Array.isArray(data.settings)) {
    fail('备份文件缺少 links / folders / settings')
  }
  if (data.links.length > 5000 || data.folders.length > 500) fail('备份数据量超出限制')

  return {
    app: 'atv-homepage',
    version: BACKUP_VERSION,
    exported_at: asOrder(body.exported_at, 'exported_at', Date.now()),
    data: {
      links: data.links.map(parseLink),
      folders: data.folders.map(parseFolder),
      settings: data.settings.map(parseSetting),
    },
  }
}

backup.post('/restore', async (c) => {
  const payload = normalizeBackup(await c.req.json().catch(() => null))
  const { links, folders, settings } = payload.data

  // 文件夹引用完整性
  const folderIds = new Set(folders.map((f) => f.id))
  for (const link of links) {
    if (link.folder_id && !folderIds.has(link.folder_id)) link.folder_id = null
  }

  const now = Date.now()
  const stmts: D1PreparedStatement[] = [
    c.env.DB.prepare('DELETE FROM links'),
    c.env.DB.prepare('DELETE FROM folders'),
    c.env.DB.prepare('DELETE FROM settings'),
    ...folders.map((f) =>
      c.env.DB
        .prepare('INSERT INTO folders (id, name, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(f.id, f.name, f.color, f.sort_order, f.created_at),
    ),
    ...links.map((l) =>
      c.env.DB
        .prepare(
          `INSERT INTO links (id, title, url, icon, folder_id, sort_order, is_pinned, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(l.id, l.title, l.url, l.icon, l.folder_id, l.sort_order, l.is_pinned, l.created_at, l.updated_at),
    ),
    ...settings.map((s) => c.env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').bind(s.key, s.value)),
    c.env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind('restored_at', String(now)),
  ]

  await c.env.DB.batch(stmts)
  return c.json({ ok: true, links: links.length, folders: folders.length, settings: settings.length })
})

export default backup
