import type { Directive } from 'vue'

/**
 * 元素进入视口时打上 `data-in-view` 标记（配合 .reveal 实现滚动入场）。
 * 注意：标记必须用属性而非 class —— 元素上的 :class 绑定一旦更新，Vue 会整体重写
 * className，指令追加的 class 会被抹掉（导致卡片在编辑模式下凭空消失）。
 */
export const vIntersect: Directive<HTMLElement, void> = {
  mounted(el) {
    const attr = 'data-in-view'
    if (typeof IntersectionObserver === 'undefined') {
      el.setAttribute(attr, '')
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.setAttribute(attr, '')
            io.disconnect()
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    io.observe(el)
  },
}
