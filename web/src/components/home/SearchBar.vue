<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

type EngineKey = 'bing' | 'baidu' | 'google'

const ENGINES: { key: EngineKey; name: string; hint: string; url: (q: string) => string }[] = [
  { key: 'bing', name: '必应', hint: '微软搜索', url: (q) => `https://www.bing.com/search?q=${q}` },
  { key: 'baidu', name: '百度', hint: '中文搜索', url: (q) => `https://www.baidu.com/s?wd=${q}` },
  { key: 'google', name: '谷歌', hint: '全球搜索', url: (q) => `https://www.google.com/search?q=${q}` },
]

const STORAGE_KEY = 'atv-search-engine'

const engineKey = ref<EngineKey>('bing')
const query = ref('')
const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const engine = computed(() => ENGINES.find((e) => e.key === engineKey.value) ?? ENGINES[0])

function onOutside(e: PointerEvent) {
  if (menuOpen.value && menuRef.value && !menuRef.value.contains(e.target as Node)) menuOpen.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') menuOpen.value = false
}

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && ENGINES.some((e) => e.key === saved)) engineKey.value = saved as EngineKey
  window.addEventListener('pointerdown', onOutside)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('pointerdown', onOutside)
  window.removeEventListener('keydown', onKeydown)
})

function pick(key: EngineKey) {
  engineKey.value = key
  localStorage.setItem(STORAGE_KEY, key)
  menuOpen.value = false
}

function submit() {
  const q = query.value.trim()
  if (!q) return
  window.open(engine.value.url(encodeURIComponent(q)), '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <form class="search" role="search" @submit.prevent="submit">
    <!-- 搜索引擎切换 -->
    <div ref="menuRef" class="search__engine">
      <button
        type="button"
        class="search__engine-btn"
        :aria-expanded="menuOpen"
        aria-label="选择搜索引擎"
        @click="menuOpen = !menuOpen"
      >
        <span class="search__dot" :class="`is-${engine.key}`" />
        <span class="search__engine-name">{{ engine.name }}</span>
        <svg
          class="search__chevron"
          :class="{ 'is-open': menuOpen }"
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <Transition name="pop">
        <ul v-if="menuOpen" class="search__menu">
          <li v-for="item in ENGINES" :key="item.key">
            <button type="button" class="search__menu-item" :class="{ 'is-active': item.key === engineKey }" @click="pick(item.key)">
              <span class="search__dot" :class="`is-${item.key}`" />
              <span class="search__menu-name">{{ item.name }}</span>
              <span class="search__menu-hint">{{ item.hint }}</span>
              <svg v-if="item.key === engineKey" class="search__check" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </button>
          </li>
        </ul>
      </Transition>
    </div>

    <span class="search__divider" aria-hidden="true" />

    <input
      v-model="query"
      class="search__input"
      type="search"
      enterkeyhint="search"
      autocomplete="off"
      placeholder="搜索…"
      aria-label="搜索内容"
    />

    <button type="submit" class="search__go" aria-label="搜索">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.6-3.6" />
      </svg>
    </button>
  </form>
</template>

<style scoped>
.search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 58px;
  padding: 0 8px 0 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.075);
  border: 1px solid var(--stroke);
  backdrop-filter: blur(26px) saturate(165%);
  -webkit-backdrop-filter: blur(26px) saturate(165%);
  box-shadow: 0 20px 52px rgba(0, 0, 0, 0.34);
  transition:
    border-color 300ms var(--ease-out),
    box-shadow 380ms var(--ease-out),
    transform 420ms var(--ease-spring),
    background 300ms ease;
  will-change: transform;
}

.search:hover {
  background: rgba(255, 255, 255, 0.1);
}

.search:focus-within {
  transform: translateY(-2px);
  border-color: rgba(127, 178, 255, 0.55);
  background: rgba(255, 255, 255, 0.11);
  box-shadow:
    0 26px 62px rgba(0, 0, 0, 0.42),
    0 0 0 4px rgba(77, 141, 255, 0.16);
}

/* 引擎切换 */
.search__engine {
  position: relative;
  flex: none;
}

.search__engine-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 12px;
  border-radius: 999px;
  color: var(--text-dim);
  font-size: 14px;
  font-weight: 500;
  transition:
    color var(--dur-fast) ease,
    background var(--dur-fast) ease;
}

.search__engine-btn:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.09);
}

.search__engine-name {
  min-width: 44px;
  text-align: left;
}

.search__chevron {
  transition: transform 300ms var(--ease-spring);
  opacity: 0.7;
}

.search__chevron.is-open {
  transform: rotate(180deg);
}

.search__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
}

.search__dot.is-bing {
  background: #0c8484;
}

.search__dot.is-baidu {
  background: #4e6ef2;
}

.search__dot.is-google {
  background: linear-gradient(135deg, #ea4335 25%, #fbbc05 25% 50%, #34a853 50% 75%, #4285f4 75%);
}

.search__divider {
  width: 1px;
  height: 26px;
  background: var(--stroke-strong);
  flex: none;
}

/* 下拉菜单 */
.search__menu {
  position: absolute;
  top: calc(100% + 12px);
  left: -6px;
  z-index: 20;
  min-width: 210px;
  padding: 8px;
  list-style: none;
  margin: 0;
  border-radius: 20px;
  background: rgba(22, 26, 38, 0.92);
  border: 1px solid var(--stroke-strong);
  backdrop-filter: blur(26px) saturate(160%);
  -webkit-backdrop-filter: blur(26px) saturate(160%);
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.5);
  transform-origin: top left;
  transition: transform 340ms var(--ease-out), opacity 240ms var(--ease-out);
}

.search__menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 13px;
  font-size: 14px;
  color: var(--text-dim);
  transition: background var(--dur-fast) ease, color var(--dur-fast) ease;
}

.search__menu-item:hover {
  background: rgba(255, 255, 255, 0.09);
  color: var(--text);
}

.search__menu-item.is-active {
  color: var(--text);
  background: rgba(127, 178, 255, 0.14);
}

.search__menu-name {
  font-weight: 550;
}

.search__menu-hint {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-faint);
}

.search__check {
  color: var(--accent);
  flex: none;
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: scale(0.94) translateY(-8px);
}

/* 输入框 */
.search__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  background: none;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 16px;
  letter-spacing: 0.01em;
  appearance: none;
}

.search__input::placeholder {
  color: var(--text-faint);
}

.search__input::-webkit-search-decoration,
.search__input::-webkit-search-cancel-button {
  appearance: none;
}

/* 搜索按钮 */
.search__go {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(180deg, var(--accent-strong), #3a6fe0);
  box-shadow: 0 12px 28px rgba(77, 141, 255, 0.32);
  transition:
    transform 380ms var(--ease-spring),
    box-shadow 320ms var(--ease-out),
    filter 240ms ease;
}

.search__go:hover {
  transform: scale(1.08);
  box-shadow: 0 16px 36px rgba(77, 141, 255, 0.44);
}

.search__go:active {
  transform: scale(0.94);
}

@media (max-width: 560px) {
  .search {
    height: 52px;
    padding-left: 12px;
    gap: 8px;
  }

  .search__engine-name {
    min-width: 0;
  }

  .search__input {
    font-size: 15px;
  }

  .search__go {
    width: 40px;
    height: 40px;
  }
}
</style>
