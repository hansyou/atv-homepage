import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api/client'
import type { BackupFile, Bootstrap, Folder, FolderPayload, Link, LinkPayload } from '../api/types'

export type GridItem =
  | { key: string; type: 'folder'; folder: Folder; sort_order: number }
  | { key: string; type: 'link'; link: Link; sort_order: number }

const byOrder = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order

export const useCatalog = defineStore('catalog', () => {
  const links = ref<Link[]>([])
  const folders = ref<Folder[]>([])
  const settings = ref<Record<string, string>>({})

  const pinned = computed(() =>
    links.value
      .filter((l) => l.is_pinned === 1)
      .sort(byOrder)
      .slice(0, 5),
  )

  /** 启动台网格：文件夹与独立网址按 sort_order 交错排列 */
  const topLevel = computed<GridItem[]>(() => {
    const items: GridItem[] = [
      ...folders.value.map((f) => ({ key: `f-${f.id}`, type: 'folder' as const, folder: f, sort_order: f.sort_order })),
      ...links.value
        .filter((l) => !l.folder_id)
        .map((l) => ({ key: `l-${l.id}`, type: 'link' as const, link: l, sort_order: l.sort_order })),
    ]
    return items.sort(byOrder)
  })

  function linksOf(folderId: string): Link[] {
    return links.value.filter((l) => l.folder_id === folderId).sort(byOrder)
  }

  function folderOf(id: string | null): Folder | undefined {
    return id ? folders.value.find((f) => f.id === id) : undefined
  }

  async function load(): Promise<Bootstrap> {
    const data = await api.bootstrap()
    links.value = data.links
    folders.value = data.folders
    settings.value = data.settings
    return data
  }

  async function createLink(payload: LinkPayload): Promise<Link> {
    const { link } = await api.createLink(payload)
    links.value.push(link)
    return link
  }

  async function updateLink(id: string, payload: Partial<LinkPayload>): Promise<Link> {
    const { link } = await api.updateLink(id, payload)
    const idx = links.value.findIndex((l) => l.id === id)
    if (idx >= 0) links.value[idx] = link
    return link
  }

  async function removeLink(id: string): Promise<void> {
    await api.deleteLink(id)
    links.value = links.value.filter((l) => l.id !== id)
  }

  async function createFolder(payload: FolderPayload): Promise<Folder> {
    const { folder } = await api.createFolder(payload)
    folders.value.push(folder)
    return folder
  }

  async function updateFolder(id: string, payload: Partial<FolderPayload>): Promise<Folder> {
    const { folder } = await api.updateFolder(id, payload)
    const idx = folders.value.findIndex((f) => f.id === id)
    if (idx >= 0) folders.value[idx] = folder
    return folder
  }

  async function removeFolder(id: string): Promise<void> {
    await api.deleteFolder(id)
    folders.value = folders.value.filter((f) => f.id !== id)
    links.value = links.value.map((l) => (l.folder_id === id ? { ...l, folder_id: null } : l))
  }

  /** 拖拽排序：items 为网格中最新的完整顺序 */
  async function applyOrder(items: GridItem[]): Promise<void> {
    const linkOrders: { id: string; sort_order: number }[] = []
    const folderOrders: { id: string; sort_order: number }[] = []

    items.forEach((item, index) => {
      if (item.type === 'link') {
        linkOrders.push({ id: item.link.id, sort_order: index })
        const target = links.value.find((l) => l.id === item.link.id)
        if (target) target.sort_order = index
      } else {
        folderOrders.push({ id: item.folder.id, sort_order: index })
        const target = folders.value.find((f) => f.id === item.folder.id)
        if (target) target.sort_order = index
      }
    })

    await api.reorder(linkOrders, folderOrders)
  }

  /** 文件夹内拖拽排序 */
  async function applyFolderOrder(folderId: string, ordered: { id: string }[]): Promise<void> {
    ordered.forEach((item, index) => {
      const target = links.value.find((l) => l.id === item.id)
      if (target) target.sort_order = index
    })
    await api.reorder(
      ordered.map((item, index) => ({ id: item.id, sort_order: index, folder_id: folderId })),
      [],
    )
  }

  /** 把网址移入 / 移出文件夹（拖拽），追加到目标列表末尾 */
  async function moveLinkToFolder(linkId: string, folderId: string | null): Promise<void> {
    const link = links.value.find((l) => l.id === linkId)
    if (!link) return
    const sort_order = links.value.filter((l) => l.folder_id === folderId && l.id !== linkId).length
    link.folder_id = folderId
    link.sort_order = sort_order
    await api.updateLink(linkId, { folder_id: folderId, sort_order })
  }

  async function saveSettings(patch: Record<string, string>): Promise<void> {
    await api.saveSettings(patch)
    settings.value = { ...settings.value, ...patch }
  }

  async function exportBackup(): Promise<BackupFile> {
    return api.exportBackup()
  }

  async function restoreBackup(payload: unknown): Promise<void> {
    await api.restoreBackup(payload)
    await load()
  }

  return {
    links,
    folders,
    settings,
    pinned,
    topLevel,
    linksOf,
    folderOf,
    load,
    createLink,
    updateLink,
    removeLink,
    createFolder,
    updateFolder,
    removeFolder,
    applyOrder,
    applyFolderOrder,
    moveLinkToFolder,
    saveSettings,
    exportBackup,
    restoreBackup,
  }
})
