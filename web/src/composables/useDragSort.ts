import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'

export interface SortableItem {
  key: string
}

export interface DragSortOptions<T extends SortableItem> {
  /** 列表容器（FLIP 动画与槽位测量的作用域） */
  container: Ref<HTMLElement | null>
  /** 规范数据源（如 catalog.topLevel），拖拽期间本地顺序与之脱钩 */
  source: () => readonly T[]
  /** 编辑模式：开启后才可拖拽 */
  enabled: () => boolean
  /** 未进入编辑模式时，长按是否可触发 onEnterEditMode */
  armLongPress?: () => boolean
  onEnterEditMode?: () => void
  /** 松手后提交最终顺序 */
  onCommit: (ordered: T[]) => Promise<void> | void
  /** 拖到某项上停留可触发 onDropOn（如把网址拖入文件夹） */
  canDropOn?: (drag: T, over: T) => boolean
  onDropOn?: (drag: T, over: T) => Promise<void> | void
}

interface Slot {
  cx: number
  cy: number
}

const LONG_PRESS_MS = 420
const DWELL_MS = 650
const DRAG_THRESHOLD = 7

/**
 * 指针拖拽排序（鼠标 / 触屏通用），macOS Launchpad 风格：
 * 编辑模式下按住拖动实时换位，拖到文件夹上停留可落入文件夹。
 *
 * 命中检测基于「槽位几何」而非 elementFromPoint：拖起时记录各格子的槽位矩形，
 * 指针落在哪个槽位就插入到哪个位置，不受 FLIP 动画 / DOM 异步刷新影响，不会来回震荡。
 */
export function useDragSort<T extends SortableItem>(options: DragSortOptions<T>) {
  const order = ref<T[]>([]) as Ref<T[]>
  const dragKey = ref<string | null>(null)
  const dropKey = ref<string | null>(null)
  const offset = ref({ x: 0, y: 0 })

  let dragItem: T | null = null
  let dragEl: HTMLElement | null = null
  let pointerId = -1
  let startX = 0
  let startY = 0
  let lastX = 0
  let lastY = 0
  let grabDx = 0
  let grabDy = 0
  let slots: Slot[] = []
  let bounds: DOMRect | null = null
  let longTimer: ReturnType<typeof setTimeout> | null = null
  let dwellTimer: ReturnType<typeof setTimeout> | null = null
  let hoverIndex = -1
  let suppressClick = false
  let rafId = 0

  watch(
    () => options.source(),
    (list) => {
      if (dragItem) return
      order.value = [...list]
    },
    { immediate: true },
  )

  /* ---------- FLIP：换位时其余卡片平滑滑动 ---------- */

  function captureRects(): Map<string, DOMRect> {
    const rects = new Map<string, DOMRect>()
    const root = options.container.value
    if (!root) return rects
    for (const el of root.querySelectorAll<HTMLElement>('[data-sort-key]')) {
      if (el.dataset.sortKey) rects.set(el.dataset.sortKey, el.getBoundingClientRect())
    }
    return rects
  }

  function playFlip(before: Map<string, DOMRect>): void {
    const root = options.container.value
    if (!root) return
    for (const el of root.querySelectorAll<HTMLElement>('[data-sort-key]')) {
      const key = el.dataset.sortKey
      if (!key || key === dragKey.value) continue
      const prev = before.get(key)
      if (!prev) continue
      const rect = el.getBoundingClientRect()
      const dx = prev.left - rect.left
      const dy = prev.top - rect.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
      el.style.transition = 'none'
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
      requestAnimationFrame(() => {
        el.style.transition = 'transform 260ms var(--ease-out)'
        el.style.transform = ''
        setTimeout(() => {
          if (el.style.transition.startsWith('transform 260ms')) el.style.transition = ''
        }, 280)
      })
    }
  }

  function reorderTo(to: number): void {
    const from = order.value.findIndex((it) => it.key === dragKey.value)
    if (from < 0 || to < 0 || from === to) return
    const before = captureRects()
    const next = [...order.value]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    order.value = next
    nextTick(() => {
      playFlip(before)
      syncDragEl()
    })
  }

  /* ---------- 槽位命中 ---------- */

  function measureSlots(): void {
    const root = options.container.value
    slots = []
    bounds = null
    if (!root) return
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    for (const el of root.querySelectorAll<HTMLElement>('[data-sort-key]')) {
      const r = el.getBoundingClientRect()
      slots.push({ cx: r.left + scrollX + r.width / 2, cy: r.top + scrollY + r.height / 2 })
    }
    const b = root.getBoundingClientRect()
    bounds = new DOMRect(b.left + scrollX - 40, b.top + scrollY - 40, b.width + 80, b.height + 80)
  }

  /** 指针（文档坐标）落在哪个槽位；离网格太远返回 -1 */
  function slotAt(px: number, py: number): number {
    if (!bounds || px < bounds.left || px > bounds.right || py < bounds.top || py > bounds.bottom) return -1
    let best = -1
    let bestDist = Infinity
    for (let i = 0; i < slots.length; i++) {
      const d = (px - slots[i].cx) ** 2 + (py - slots[i].cy) ** 2
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    return best
  }

  function clearDwell(): void {
    if (dwellTimer) {
      clearTimeout(dwellTimer)
      dwellTimer = null
    }
    dropKey.value = null
  }

  function hitTest(x: number, y: number): void {
    if (!dragItem) return
    const index = slotAt(x + window.scrollX, y + window.scrollY)
    if (index < 0 || index === hoverIndex) return
    hoverIndex = index

    const over = order.value[index]
    if (over && over.key !== dragKey.value && options.canDropOn?.(dragItem, over)) {
      // 可落入目标（如文件夹）：停留片刻触发落点，期间不换位
      clearDwell()
      dwellTimer = setTimeout(() => {
        dwellTimer = null
        dropKey.value = over.key
      }, DWELL_MS)
      return
    }

    clearDwell()
    reorderTo(index)
  }

  /* ---------- 拖拽卡片跟随指针（换位后自动校正） ---------- */

  function syncDragEl(): void {
    if (!dragEl) return
    const rect = dragEl.getBoundingClientRect()
    const cur = offset.value
    offset.value = {
      x: cur.x + (lastX - grabDx) - (rect.left + rect.width / 2),
      y: cur.y + (lastY - grabDy) - (rect.top + rect.height / 2),
    }
  }

  /* ---------- 拖到视口边缘自动滚屏 ---------- */

  function scheduleAutoScroll(): void {
    if (rafId) return
    const step = () => {
      rafId = 0
      if (!dragKey.value) return
      const edge = 90
      const h = window.innerHeight
      if (lastY < edge) window.scrollBy(0, -Math.ceil((edge - lastY) / 5))
      else if (lastY > h - edge) window.scrollBy(0, Math.ceil((lastY - (h - edge)) / 5))
      rafId = requestAnimationFrame(step)
    }
    rafId = requestAnimationFrame(step)
  }

  /* ---------- 指针事件 ---------- */

  function cleanup(): void {
    if (longTimer) {
      clearTimeout(longTimer)
      longTimer = null
    }
    clearDwell()
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('touchmove', onTouchMove)
    dragEl = null
    dragItem = null
    pointerId = -1
    hoverIndex = -1
    slots = []
    bounds = null
    dragKey.value = null
    dropKey.value = null
    offset.value = { x: 0, y: 0 }
    document.body.classList.remove('is-sorting')
  }

  function onPointerDown(e: PointerEvent, item: T): void {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (dragItem) return
    if (!options.enabled() && !options.armLongPress?.()) return
    // 编辑 / 删除按钮保留点击行为
    if ((e.target as HTMLElement | null)?.closest('button')) return

    pointerId = e.pointerId
    startX = e.clientX
    startY = e.clientY
    lastX = e.clientX
    lastY = e.clientY
    dragItem = item
    dragEl = e.currentTarget as HTMLElement
    suppressClick = false

    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('touchmove', onTouchMove, { passive: false })

    // 未进入编辑模式：长按进入（macOS Launchpad 手感）
    if (!options.enabled()) {
      longTimer = setTimeout(() => {
        longTimer = null
        if (!dragItem) return
        options.onEnterEditMode?.()
        suppressClick = true
      }, LONG_PRESS_MS)
    }
  }

  function onPointerMove(e: PointerEvent): void {
    if (!dragItem || e.pointerId !== pointerId) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    if (!dragKey.value) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      if (!options.enabled()) {
        // 未进入编辑模式的移动视为普通滚动，取消长按
        cleanup()
        return
      }
      const rect = dragEl?.getBoundingClientRect()
      if (rect) {
        grabDx = startX - (rect.left + rect.width / 2)
        grabDy = startY - (rect.top + rect.height / 2)
      }
      measureSlots()
      dragKey.value = dragItem.key
      suppressClick = true
      document.body.classList.add('is-sorting')
      scheduleAutoScroll()
    }

    e.preventDefault()
    lastX = e.clientX
    lastY = e.clientY
    syncDragEl()
    hitTest(e.clientX, e.clientY)
  }

  /** 触屏滚动拦截：pointermove 的 preventDefault 不足以阻止页面滚动 */
  function onTouchMove(e: TouchEvent): void {
    if (!dragItem) return
    if (dragKey.value || options.enabled()) e.preventDefault()
  }

  function onClickCapture(e: MouseEvent): void {
    if (!suppressClick) return
    suppressClick = false
    e.preventDefault()
    e.stopPropagation()
  }

  async function onPointerUp(e: PointerEvent): Promise<void> {
    if (e.pointerId !== pointerId) return
    const drag = dragItem
    const wasDragging = dragKey.value !== null
    const drop = dropKey.value ? order.value.find((it) => it.key === dropKey.value) ?? null : null
    const finalOrder = [...order.value]
    const beforeKeys = options.source().map((it) => it.key).join(',')
    cleanup()
    if (!wasDragging || !drag) return

    suppressClick = true
    try {
      if (beforeKeys !== finalOrder.map((it) => it.key).join(',')) await options.onCommit(finalOrder)
      if (drop) await options.onDropOn?.(drag, drop)
    } catch {
      // 由调用方在 onCommit / onDropOn 内处理错误提示
    }
  }

  /** 系统接管手势（如开始滚动）：放弃拖拽并还原顺序 */
  function onCancel(): void {
    order.value = [...options.source()]
    cleanup()
  }

  /* ---------- 模板辅助 ---------- */

  function styleFor(item: T, extra: Record<string, string | number> = {}): Record<string, string | number> {
    const style: Record<string, string | number> = { ...extra }
    if (dragKey.value === item.key) {
      style.transform = `translate3d(${offset.value.x}px, ${offset.value.y}px, 0) scale(1.12) rotate(1.6deg)`
      style.transition = 'none'
      style.zIndex = 40
    }
    return style
  }

  onBeforeUnmount(cleanup)

  return {
    order,
    dragKey,
    dropKey,
    styleFor,
    onPointerDown,
    onClickCapture,
  }
}
