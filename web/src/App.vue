<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import AppHeader from './components/AppHeader.vue'
import ToastHost from './components/ToastHost.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import FolderOverlay from './components/cards/FolderOverlay.vue'
import AdminDrawer from './components/admin/AdminDrawer.vue'
import { useCatalog } from './stores/catalog'
import { useAuth } from './stores/auth'
import { useUi } from './stores/ui'
import { destroySmoothScroll, initSmoothScroll, lockScroll, unlockScroll } from './composables/useLenis'

const catalog = useCatalog()
const auth = useAuth()
const ui = useUi()

const wallpaperUrl = computed(() => catalog.settings.wallpaper_url || '')
const photoStyle = computed(() =>
  wallpaperUrl.value ? { backgroundImage: `url(${wallpaperUrl.value})` } : {},
)

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (ui.drawerOpen) ui.closeDrawer()
  else if (ui.overlayFolderId) ui.openFolderOverlay(null)
}

onMounted(async () => {
  initSmoothScroll()
  window.addEventListener('keydown', onKeydown)

  try {
    const data = await catalog.load()
    auth.setAuthed(data.authed)
  } catch {
    ui.toast('站点数据加载失败，请刷新重试', 'error')
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  destroySmoothScroll()
})

// 抽屉 / 浮层打开时锁定页面滚动
watch(
  () => ui.hasLayer,
  (locked) => (locked ? lockScroll() : unlockScroll()),
)
</script>

<template>
  <div class="page-bg" aria-hidden="true">
    <div class="page-bg__photo" :class="{ 'is-loaded': wallpaperUrl }" :style="photoStyle" />
    <div class="page-bg__scrim" />
    <div class="page-bg__glow page-bg__glow--a" />
    <div class="page-bg__glow page-bg__glow--b" />
    <div class="page-bg__noise" />
  </div>

  <AppHeader />

  <main class="app-main">
    <router-view v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </router-view>
  </main>

  <FolderOverlay />
  <AdminDrawer />
  <ConfirmDialog />
  <ToastHost />
</template>

<style scoped>
.app-main {
  position: relative;
  z-index: 1;
}
</style>
