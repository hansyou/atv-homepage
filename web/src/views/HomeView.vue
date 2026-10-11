<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import HeroSection from '../components/home/HeroSection.vue'
import LaunchpadPanel from '../components/launchpad/LaunchpadPanel.vue'

const heroRef = ref<HTMLElement | null>(null)

let rafId = 0

/** 每帧把滚动进度写入 CSS 变量 --p，驱动首屏视差 */
function loop(): void {
  const vh = window.innerHeight || 1
  const p = Math.min(1, Math.max(0, window.scrollY / (vh * 0.85)))
  heroRef.value?.style.setProperty('--p', p.toFixed(4))
  rafId = requestAnimationFrame(loop)
}

onMounted(() => {
  rafId = requestAnimationFrame(loop)
})

onUnmounted(() => cancelAnimationFrame(rafId))
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
