import type { BackupFile, Bootstrap, Folder, FolderPayload, Link, LinkPayload } from './types'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError((data as { error?: string } | null)?.error || `请求失败（${res.status}）`, res.status)
  }
  return data as T
}

export const api = {
  bootstrap: () => request<Bootstrap>('/api/bootstrap'),

  // 认证
  login: (password: string) => request<{ ok: boolean }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  // 网址
  createLink: (payload: LinkPayload) => request<{ link: Link }>('/api/links', { method: 'POST', body: JSON.stringify(payload) }),
  updateLink: (id: string, payload: Partial<LinkPayload>) =>
    request<{ link: Link }>(`/api/links/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteLink: (id: string) => request<{ ok: boolean }>(`/api/links/${id}`, { method: 'DELETE' }),

  // 文件夹
  createFolder: (payload: FolderPayload) => request<{ folder: Folder }>('/api/folders', { method: 'POST', body: JSON.stringify(payload) }),
  updateFolder: (id: string, payload: Partial<FolderPayload>) =>
    request<{ folder: Folder }>(`/api/folders/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteFolder: (id: string) => request<{ ok: boolean }>(`/api/folders/${id}`, { method: 'DELETE' }),

  // 顺序
  reorder: (links: { id: string; sort_order: number; folder_id?: string | null }[], folders: { id: string; sort_order: number }[]) =>
    request<{ ok: boolean }>('/api/reorder', { method: 'PATCH', body: JSON.stringify({ links, folders }) }),

  // 站点设置
  saveSettings: (settings: Record<string, string>) =>
    request<{ ok: boolean }>('/api/settings', { method: 'POST', body: JSON.stringify({ settings }) }),

  // 备份
  exportBackup: () => request<BackupFile>('/api/backup'),
  restoreBackup: (payload: unknown) => request<{ ok: boolean; links: number; folders: number }>('/api/backup/restore', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
}
