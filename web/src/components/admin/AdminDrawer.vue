<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useAuth } from '../../stores/auth'
import { useCatalog } from '../../stores/catalog'
import { useUi, type DrawerTab } from '../../stores/ui'
import BackupPanel from './BackupPanel.vue'
import FolderEditor from './FolderEditor.vue'
import LinkEditor from './LinkEditor.vue'

const catalog = useCatalog()
const auth = useAuth()
const ui = useUi()

const password = ref('')
const loginError = ref('')
const loginPending = ref(false)
const shake = ref(false)
const savingSite = ref(false)

const site = reactive({ tagline: '', show_clock: true, wallpaper_url: '' })
const wallpaperInput = ref<HTMLInputElement | null>(null)

const MAX_WALLPAPER = 1_400_000 // data URL 长度上限（约 1MB 图片）

// 网址 / 文件夹直接在主页网格里管理，这里只管站点设置与备份
const TABS: { key: DrawerTab; label: string }[] = [
  { key: 'site', label: '站点' },
  { key: 'backup', label: '备份' },
]

watch(
  () => ui.drawerOpen,
  (open) => {
    if (!open) return
    password.value = ''
    loginError.value = ''
    site.tagline = catalog.settings.tagline || ''
    site.show_clock = catalog.settings.show_clock !== 'false'
    site.wallpaper_url = catalog.settings.wallpaper_url || ''
  },
)

function triggerShake(): void {
  shake.value = false
  requestAnimationFrame(() => {
    shake.value = true
    setTimeout(() => (shake.value = false), 520)
  })
}

async function onLogin(): Promise<void> {
  if (!password.value) return
  loginPending.value = true
  loginError.value = ''
  try {
    await auth.login(password.value)
    password.value = ''
    ui.toast('登录成功，可以管理内容了', 'success')
  } catch (err) {
    loginError.value = (err as Error).message
    triggerShake()
  } finally {
    loginPending.value = false
  }
}

async function onLogout(): Promise<void> {
  await auth.logout()
  ui.closeDrawer()
  ui.toast('已退出登录', 'info')
}

async function onSaveSite(): Promise<void> {
  savingSite.value = true
  try {
    await catalog.saveSettings({
      tagline: site.tagline,
      show_clock: site.show_clock ? 'true' : 'false',
      wallpaper_url: site.wallpaper_url,
    })
    ui.toast('站点设置已保存', 'success')
  } catch (err) {
    ui.toast((err as Error).message, 'error')
  } finally {
    savingSite.value = false
  }
}

function pickWallpaper(): void {
  wallpaperInput.value?.click()
}

function onWallpaperFile(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ui.toast('请选择图片文件', 'error')
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const dataUrl = String(reader.result ?? '')
    if (dataUrl.length > MAX_WALLPAPER) {
      ui.toast('图片太大，请压缩到 1MB 以内', 'error')
      return
    }
    site.wallpaper_url = dataUrl
    ui.toast('已选择本地图片，点「保存设置」生效', 'success')
  }
  reader.readAsDataURL(file)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="layer">
      <div v-if="ui.drawerOpen" class="drawer-layer" @click.self="ui.closeDrawer()">
        <aside class="drawer" :class="{ 'is-shake': shake }" role="dialog" aria-modal="true" aria-label="管理面板">
          <header class="drawer__head">
            <h2 class="drawer__title">管理</h2>
            <button class="drawer__close" aria-label="关闭" @click="ui.closeDrawer()">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </header>

          <!-- 登录 -->
          <form v-if="!auth.authed" class="drawer__login" @submit.prevent="onLogin">
            <p class="drawer__hint">输入管理密码以新建、修改或备份内容</p>
            <div class="field">
              <label class="field__label" for="admin-password">管理密码</label>
              <input
                id="admin-password"
                v-model="password"
                class="input"
                type="password"
                autocomplete="current-password"
                placeholder="••••••••"
                autofocus
              />
            </div>
            <p v-if="loginError" class="field__error">{{ loginError }}</p>
            <button class="btn btn--primary drawer__submit" type="submit" :disabled="loginPending">
              {{ loginPending ? '验证中…' : '进入管理' }}
            </button>
          </form>

          <!-- 管理 -->
          <template v-else>
            <!-- 编辑表单时隐藏标签栏（此时切换标签无意义） -->
            <nav v-if="!ui.linkEditorOpen && !ui.folderEditorOpen" class="drawer__tabs">
              <button
                v-for="tab in TABS"
                :key="tab.key"
                class="drawer__tab"
                :class="{ 'is-active': ui.tab === tab.key }"
                @click="ui.tab = tab.key"
              >
                {{ tab.label }}
              </button>
              <button class="drawer__tab drawer__tab--logout" @click="onLogout">退出</button>
            </nav>

            <div class="drawer__body" data-lenis-prevent>
              <!-- 编辑器子视图 -->
              <LinkEditor v-if="ui.linkEditorOpen" :link="ui.editingLink" @done="ui.linkEditorOpen = false" />
              <FolderEditor v-else-if="ui.folderEditorOpen" :folder="ui.editingFolder" @done="ui.folderEditorOpen = false" />

              <!-- 站点设置 -->
              <template v-else-if="ui.tab === 'site'">
                <div class="drawer__form">
                  <div class="field">
                    <label class="field__label" for="site-tagline">顶部小字（选填）</label>
                    <input id="site-tagline" v-model="site.tagline" class="input" maxlength="40" placeholder="留空则只显示问候与时钟" />
                  </div>

                  <div class="field">
                    <label class="field__label" for="site-wallpaper">背景壁纸</label>
                    <input
                      id="site-wallpaper"
                      v-model="site.wallpaper_url"
                      class="input"
                      placeholder="图片链接（https://…），或上传本地图片"
                    />
                    <div class="site__wallpaper-actions">
                      <button class="btn btn--sm" @click="pickWallpaper">上传本地图片</button>
                      <button v-if="site.wallpaper_url" class="btn btn--sm" @click="site.wallpaper_url = ''">恢复默认背景</button>
                    </div>
                    <input ref="wallpaperInput" class="site__wallpaper-file" type="file" accept="image/*" @change="onWallpaperFile" />
                    <div v-if="site.wallpaper_url" class="site__wallpaper-preview" :style="{ backgroundImage: `url(${site.wallpaper_url})` }" />
                  </div>

                  <label class="drawer__switch">
                    <input v-model="site.show_clock" type="checkbox" />
                    <span class="drawer__switch-track"><span class="drawer__switch-thumb" /></span>
                    在问候语旁显示时钟
                  </label>
                  <button class="btn btn--primary" :disabled="savingSite" @click="onSaveSite">
                    {{ savingSite ? '保存中…' : '保存设置' }}
                  </button>
                </div>
              </template>

              <!-- 备份 -->
              <BackupPanel v-else />
            </div>
          </template>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-layer {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  justify-content: flex-end;
  background: rgba(5, 7, 12, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.drawer {
  display: flex;
  flex-direction: column;
  width: min(470px, 100vw);
  height: 100%;
  padding: 26px 26px 22px;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(24, 28, 42, 0.92), rgba(14, 17, 26, 0.96));
  border-left: 1px solid var(--stroke-strong);
  box-shadow: -30px 0 90px rgba(0, 0, 0, 0.5);
  transition: transform 340ms var(--ease-out);
  will-change: transform;
}

.layer-enter-from .drawer,
.layer-leave-to .drawer {
  transform: translateX(60px);
}

.layer-enter-from,
.layer-leave-to {
  backdrop-filter: blur(0);
  -webkit-backdrop-filter: blur(0);
}

.drawer.is-shake {
  animation: shake 300ms var(--ease-in-out);
}

@keyframes shake {
  10%,
  90% {
    transform: translateX(-6px);
  }
  30%,
  70% {
    transform: translateX(8px);
  }
  50% {
    transform: translateX(-10px);
  }
}

.drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--stroke);
}

.drawer__title {
  margin: 0;
  font-size: 21px;
  font-weight: 650;
}

.drawer__close {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: var(--text-dim);
  background: var(--glass);
  border: 1px solid var(--stroke);
  transition: transform var(--dur-fast) var(--ease-spring), color var(--dur-fast) ease;
}

.drawer__close:hover {
  transform: scale(1.1) rotate(90deg);
  color: var(--text);
}

.drawer__login {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-top: 32px;
}

.drawer__hint {
  margin: 0;
  color: var(--text-faint);
  font-size: 14px;
  line-height: 1.6;
}

.drawer__submit {
  margin-top: 8px;
  width: 100%;
}

.drawer__tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 16px 0;
  border-bottom: 1px solid var(--stroke);
  overflow-x: auto;
}

.drawer__tab {
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 14px;
  color: var(--text-faint);
  white-space: nowrap;
  transition: color var(--dur-fast) ease, background var(--dur-fast) ease, transform var(--dur-fast) var(--ease-spring);
}

.drawer__tab:hover {
  color: var(--text);
  transform: translateY(-1px);
}

.drawer__tab.is-active {
  color: var(--text);
  background: var(--glass-strong);
}

.drawer__tab--logout {
  margin-left: auto;
  color: var(--danger);
}

.drawer__body {
  flex: 1;
  overflow-y: auto;
  padding: 22px 2px 12px;
  overscroll-behavior: contain;
}

.drawer__form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.site__wallpaper-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.site__wallpaper-file {
  display: none;
}

.site__wallpaper-preview {
  height: 120px;
  border-radius: var(--radius-md);
  border: 1px solid var(--stroke);
  background-size: cover;
  background-position: center;
  box-shadow: var(--shadow-card);
}

.drawer__switch {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--text-dim);
  cursor: pointer;
  user-select: none;
}

.drawer__switch input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.drawer__switch-track {
  position: relative;
  width: 46px;
  height: 27px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid var(--stroke);
  transition: background var(--dur-fast) ease;
  flex: none;
}

.drawer__switch-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: #fff;
  transition: transform 200ms var(--ease-spring);
}

.drawer__switch input:checked + .drawer__switch-track {
  background: var(--accent-strong);
}

.drawer__switch input:checked + .drawer__switch-track .drawer__switch-thumb {
  transform: translateX(19px);
}
</style>
