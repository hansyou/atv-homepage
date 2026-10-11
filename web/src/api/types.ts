export interface Link {
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

export interface Folder {
  id: string
  name: string
  color: string
  sort_order: number
  created_at: number
}

export interface Bootstrap {
  links: Link[]
  folders: Folder[]
  settings: Record<string, string>
  authed: boolean
}

export interface BackupFile {
  app: 'atv-homepage'
  version: number
  exported_at: number
  data: {
    links: Link[]
    folders: Folder[]
    settings: { key: string; value: string }[]
  }
}

export type LinkPayload = {
  title: string
  url: string
  icon?: string
  folder_id?: string | null
  is_pinned?: boolean
  sort_order?: number
}

export type FolderPayload = {
  name: string
  color?: string
}
