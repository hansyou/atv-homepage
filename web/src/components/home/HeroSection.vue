<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useCatalog } from '../../stores/catalog'
import { scrollToElement } from '../../composables/useLenis'
import LinkCard from '../cards/LinkCard.vue'
import SearchBar from './SearchBar.vue'

const catalog = useCatalog()
const now = ref(new Date())
let timer = 0

onMounted(() => {
  timer = window.setInterval(() => (now.value = new Date()), 30_000)
})

onUnmounted(() => window.clearInterval(timer))

const greeting = computed(() => {
  const h = now.value.getHours()
  if (h < 5) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 13) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const clock = computed(() =>
  now.value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
)

const note = computed(() => catalog.settings.tagline || '')
const showClock = computed(() => catalog.settings.show_clock !== 'false')
</script>

<template>
  <div class="hero">
    <!-- 顶部状态行（小字） -->
    <div class="hero__status">
      <p class="hero__greeting rise" style="--d: 80ms">
        {{ greeting }}<span v-if="showClock" class="hero__clock"> · {{ clock }}</span>
      </p>
      <p v-if="note" class="hero__note rise" style="--d: 160ms">{{ note }}</p>
    </div>

    <!-- 搜索框（默认必应，可切换百度 / 谷歌） -->
    <div class="hero__search">
      <SearchBar />
    </div>

    <!-- 底部图标坞 -->
    <div class="hero__dock-wrap">
      <div class="hero__dock">
        <template v-if="catalog.pinned.length">
          <LinkCard
            v-for="(link, i) in catalog.pinned"
            :key="link.id"
            :link="link"
            variant="hero"
            class="rise"
            :style="{ '--d': `${260 + i * 80}ms` }"
          />
        </template>
        <p v-else class="hero__empty rise" style="--d: 200ms">
          点击右上角「管理」，把常用网址放到首页
        </p>
      </div>

      <button class="hero__scroll rise" style="--d: 560ms" aria-label="进入启动台" @click="scrollToElement('.home__launch')">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: calc(100vh - var(--header-h));
  padding: 8vh clamp(20px, 5vw, 60px) 22px;
  text-align: center;
}

/* 滚动视差：由 HomeView 写入 --p（0 → 1） */
.hero__status,
.hero__search,
.hero__dock-wrap {
  transform: translate3d(0, calc(var(--p, 0) * -50px), 0);
  opacity: calc(1 - var(--p, 0) * 1.3);
  will-change: transform, opacity;
}

.hero__search {
  align-self: center;
  width: min(720px, 100%);
}

.hero__status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-top: 4vh;
}

.hero__greeting {
  margin: 0;
  font-size: 14px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.hero__clock {
  font-variant-numeric: tabular-nums;
}

.hero__note {
  margin: 0;
  font-size: 14px;
  letter-spacing: 0.06em;
  color: var(--text-dim);
}

.hero__dock-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.hero__dock {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: center;
  gap: clamp(8px, 2.2vw, 30px);
}

.hero__empty {
  margin: 0;
  padding: 22px 28px;
  border-radius: var(--radius-md);
  border: 1px dashed var(--stroke-strong);
  color: var(--text-faint);
  font-size: 14px;
  max-width: 520px;
}

/* 下箭头提示 */
.hero__scroll {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  color: var(--text-faint);
  border: 1px solid transparent;
  transition:
    color var(--dur-fast) ease,
    background var(--dur-fast) ease,
    border-color var(--dur-fast) ease,
    transform var(--dur) var(--ease-spring);
}

.hero__scroll:hover {
  color: var(--text);
  background: var(--glass);
  border-color: var(--stroke);
  transform: translateY(3px) scale(1.08);
}

.hero__scroll svg {
  animation: bob 1.6s var(--ease-in-out) infinite;
}

@keyframes bob {
  0%,
  100% {
    transform: translateY(-2px);
    opacity: 0.55;
  }
  50% {
    transform: translateY(4px);
    opacity: 1;
  }
}
</style>
