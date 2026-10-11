import Lenis from 'lenis'

function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

let lenis: Lenis | null = null
let rafId = 0

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

  const raf = (time: number) => {
    lenis?.raf(time)
    rafId = requestAnimationFrame(raf)
  }
  rafId = requestAnimationFrame(raf)
}

export function destroySmoothScroll(): void {
  cancelAnimationFrame(rafId)
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
    return
  }
  const el = typeof target === 'string' ? document.querySelector(target) : target
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
