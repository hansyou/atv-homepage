import Lenis from 'lenis'

function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

let lenis: Lenis | null = null
let rafId = 0
let idleFrames = 0

/** 空闲多少帧后停掉 rAF 循环（约 0.5s 无滚动即休眠，由输入事件唤醒） */
const IDLE_FRAMES = 30

function tick(time: number): void {
  if (!lenis) return
  lenis.raf(time)
  // 滚动动画进行中持续跑；结束后再跑一小段兜底，然后停摆
  idleFrames = lenis.isScrolling ? 0 : idleFrames + 1
  rafId = idleFrames < IDLE_FRAMES ? requestAnimationFrame(tick) : 0
}

/** 唤醒 rAF 循环（幂等） */
function wake(): void {
  if (!lenis || rafId) return
  idleFrames = 0
  rafId = requestAnimationFrame(tick)
}

/** 全局平滑滚动（Apple TV 式惯性） */
export function initSmoothScroll(): void {
  if (lenis || prefersReducedMotion()) return

  lenis = new Lenis({
    duration: 0.85,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.6,
    wheelMultiplier: 1.05,
  })

  // 只在需要时跑 rAF：输入事件唤醒，空闲即停（低配机关键优化）
  window.addEventListener('wheel', wake, { passive: true })
  window.addEventListener('touchmove', wake, { passive: true })
  window.addEventListener('keydown', wake)
  wake()
}

export function destroySmoothScroll(): void {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
  idleFrames = 0
  window.removeEventListener('wheel', wake)
  window.removeEventListener('touchmove', wake)
  window.removeEventListener('keydown', wake)
  lenis?.destroy()
  lenis = null
}

/** 弹窗 / 抽屉打开时锁定滚动 */
export function lockScroll(): void {
  if (lenis) lenis.stop()
  document.body.classList.add('is-locked')
}

export function unlockScroll(): void {
  if (lenis) lenis.start()
  document.body.classList.remove('is-locked')
}

/** 平滑滚动到页面内目标元素 */
export function scrollToElement(target: HTMLElement | string, offset = 0): void {
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1.0 })
    wake()
    return
  }
  const el = typeof target === 'string' ? document.querySelector(target) : target
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
