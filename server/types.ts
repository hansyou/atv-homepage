export interface Bindings {
  DB: D1Database
  ASSETS: Fetcher
  /** 管理密码（wrangler secret put ADMIN_PASSWORD） */
  ADMIN_PASSWORD?: string
  /** 会话签名密钥，缺省时由 ADMIN_PASSWORD 派生 */
  SESSION_SECRET?: string
}

export interface LinkRow {
  id: string
  title: string
  url: string
  icon: string | null
  folder_id: string | null
  sort_order: number
  is_pinned: number
  created_at: number
  updated_at: number
}

export interface FolderRow {
  id: string
  name: string
  color: string
  sort_order: number
  created_at: number
}

export interface BackupFile {
  app: 'atv-homepage'
  version: number
  exported_at: number
  data: {
    links: LinkRow[]
    folders: FolderRow[]
    settings: { key: string; value: string }[]
  }
}
