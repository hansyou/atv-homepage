<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import HeroSection from '../components/home/HeroSection.vue'
import LaunchpadPanel from '../components/launchpad/LaunchpadPanel.vue'

const heroRef = ref<HTMLElement | null>(null)

let rafId = 0
let lastP = ''

/** 滚动时把进度写入 CSS 变量 --p，驱动首屏视差（rAF 节流 + 值不变不写） */
function updateP(): void {
  rafId = 0
  const el = heroRef.value
  if (!el) return
  const vh = window.innerHeight || 1
  const p = Math.min(1, Math.max(0, window.scrollY / (vh * 0.85)))
  const next = p.toFixed(4)
  if (next === lastP) return // 滚出首屏（p 封顶 1）后零写入
  lastP = next
  el.style.setProperty('--p', next)
}

function onScroll(): void {
  if (rafId) return
  rafId = requestAnimationFrame(updateP)
}

onMounted(() => {
  updateP()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<template>
  <div class="home">
    <section ref="heroRef" class="home__hero">
      <HeroSection />
    </section>

    <section class="home__launch">
      <LaunchpadPanel />
    </section>
  </div>
</template>

<style scoped>
.home__hero {
  min-height: calc(100vh - var(--header-h));
}

.home__launch {
  /* 下滑后的启动台占满整屏 */
  min-height: calc(100vh - var(--header-h));
  padding: clamp(26px, 5vh, 64px) clamp(20px, 6vw, 88px) 90px;
  box-sizing: border-box;
}
</style>
