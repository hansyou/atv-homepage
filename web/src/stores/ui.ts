import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Folder, Link } from '../api/types'

export type DrawerTab = 'site' | 'backup'
export type Toast = { id: number; text: string; type: 'info' | 'success' | 'error' }
export type ConfirmState = { open: boolean; text: string; danger: boolean; resolve: ((value: boolean) => void) | null }

export const useUi = defineStore('ui', () => {
  const drawerOpen = ref(false)
  const tab = ref<DrawerTab>('site')
  const linkEditorOpen = ref(false)
  const editingLink = ref<Link | null>(null)
  const folderEditorOpen = ref(false)
  const editingFolder = ref<Folder | null>(null)
  const overlayFolderId = ref<string | null>(null)
  /** 启动台编辑模式（图标抖动，可拖拽排序） */
  const launchpadEditing = ref(false)
  const toasts = ref<Toast[]>([])
  const confirmState = ref<ConfirmState>({ open: false, text: '', danger: false, resolve: null })

  let seq = 0

  const hasLayer = computed(() => drawerOpen.value || overlayFolderId.value !== null)

  function openDrawer(nextTab: DrawerTab = 'site'): void {
    tab.value = nextTab
    drawerOpen.value = true
  }

  function closeDrawer(): void {
    drawerOpen.value = false
    linkEditorOpen.value = false
    folderEditorOpen.value = false
  }

  function openLinkEditor(link: Link | null = null): void {
    editingLink.value = link
    linkEditorOpen.value = true
    openDrawer('site')
  }

  function openFolderEditor(folder: Folder | null = null): void {
    editingFolder.value = folder
    folderEditorOpen.value = true
    openDrawer('site')
  }

  function openFolderOverlay(folderId: string | null): void {
    overlayFolderId.value = folderId
  }

  function setLaunchpadEditing(next: boolean): void {
    launchpadEditing.value = next
  }

  function toggleLaunchpadEditing(): void {
    launchpadEditing.value = !launchpadEditing.value
  }

  function toast(text: string, type: Toast['type'] = 'info'): void {
    const id = ++seq
    toasts.value.push({ id, text, type })
    setTimeout(() => dismissToast(id), 3400)
  }

  function dismissToast(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  /** 统一的确认弹窗（Promise 风格） */
  function confirm(text: string, opts: { danger?: boolean } = {}): Promise<boolean> {
    return new Promise((resolve) => {
      confirmState.value = { open: true, text, danger: opts.danger ?? false, resolve }
    })
  }

  function answerConfirm(value: boolean): void {
    const resolve = confirmState.value.resolve
    confirmState.value = { open: false, text: '', danger: false, resolve: null }
    resolve?.(value)
  }

  return {
    drawerOpen,
    tab,
    linkEditorOpen,
    editingLink,
    folderEditorOpen,
    editingFolder,
    overlayFolderId,
    launchpadEditing,
    toasts,
    confirmState,
    hasLayer,
    openDrawer,
    closeDrawer,
    openLinkEditor,
    openFolderEditor,
    openFolderOverlay,
    setLaunchpadEditing,
    toggleLaunchpadEditing,
    toast,
    dismissToast,
    confirm,
    answerConfirm,
  }
})
