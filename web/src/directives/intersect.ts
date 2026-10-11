import type { Directive } from 'vue'

/** 元素进入视口时添加 .in-view（配合 .reveal 实现滚动入场） */
export const vIntersect: Directive<HTMLElement, string | undefined> = {
  mounted(el, binding) {
    const cls = binding.value || 'in-view'
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add(cls)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add(cls)
            io.disconnect()
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    io.observe(el)
  },
}
