<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Link } from '../../api/types'
import { faviconSrc, firstGlyph, placeholderStyle } from '../../utils/favicon'

const props = withDefaults(
  defineProps<{
    link: Link
    variant?: 'hero' | 'grid' | 'mini'
    editable?: boolean
    /** 启动台编辑模式：抖动、不可跳转 */
    editing?: boolean
  }>(),
  { variant: 'grid', editable: false, editing: false },
)

const emit = defineEmits<{ edit: [link: Link]; remove: [link: Link] }>()

const iconFailed = ref(false)
const src = computed(() => (iconFailed.value ? '' : faviconSrc(props.link)))
const glyph = computed(() => firstGlyph(props.link.title))
const tileStyle = computed(() => placeholderStyle(props.link.title))

function onMove(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${(((e.clientX - rect.left) / rect.width) * 100).toFixed(2)}%`)
  el.style.setProperty('--my', `${(((e.clientY - rect.top) / rect.height) * 100).toFixed(2)}%`)
}

function onLeave(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  el.style.setProperty('--mx', '50%')
  el.style.setProperty('--my', '50%')
}
</script>

<template>
  <a
    class="lcard"
    :class="[`lcard--${variant}`, { 'is-jiggling': editing, 'is-editing': editing }]"
    :href="editing ? undefined : link.url"
    target="_blank"
    rel="noopener noreferrer"
    :title="link.url"
    @click="editing && $event.preventDefault()"
    @pointermove="onMove"
    @pointerleave="onLeave"
  >
    <span class="lcard__glow" aria-hidden="true" />
    <span class="lcard__media">
      <img v-if="src" class="lcard__icon" :src="src" alt="" loading="lazy" @error="iconFailed = true" />
      <span v-else class="lcard__letter" :style="tileStyle">{{ glyph }}</span>
      <span class="lcard__sheen" aria-hidden="true" />
    </span>
    <span class="lcard__title">{{ link.title }}</span>

    <span v-if="editable" class="lcard__tools">
      <button class="lcard__tool" aria-label="编辑" @click.prevent.stop="emit('edit', link)">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
      <button class="lcard__tool lcard__tool--danger" aria-label="删除" @click.prevent.stop="emit('remove', link)">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
        </svg>
      </button>
    </span>
  </a>
</template>

<style scoped>
.lcard {
  --size: 66px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px 12px 18px;
  border-radius: var(--radius-lg);
  isolation: isolate;
  transition: transform 320ms var(--ease-spring);
  will-change: transform;
}

.lcard--hero {
  --size: clamp(76px, 8.4vw, 96px);
}

.lcard--mini {
  --size: 52px;
  padding: 12px 8px 14px;
  gap: 9px;
}

.lcard:hover {
  transform: translateY(-3px);
}

.lcard.is-editing:hover {
  transform: none;
}

.lcard.is-editing .lcard__tools {
  opacity: 1;
  transform: none;
}

.lcard:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
  border-radius: var(--radius-lg);
}

.lcard__glow {
  position: absolute;
  inset: 8% 12% 26%;
  z-index: -1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(120, 165, 255, 0.5), rgba(120, 165, 255, 0) 70%);
  filter: blur(26px);
  opacity: 0;
  transform: scale(0.7);
  transition:
    opacity 320ms var(--ease-out),
    transform 380ms var(--ease-spring);
  will-change: transform, opacity;
}

.lcard:hover .lcard__glow {
  opacity: 0.85;
  transform: scale(1);
}

.lcard__media {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--size);
  height: var(--size);
  border-radius: calc(var(--size) * 0.32);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid var(--stroke);
  box-shadow: var(--shadow-card);
  transition:
    transform 340ms var(--ease-spring),
    box-shadow 300ms var(--ease-out),
    border-color 200ms ease;
  will-change: transform;
}

.lcard:hover .lcard__media {
  transform: scale(1.08) translateY(-7px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--stroke-strong);
}

.lcard__icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}

.lcard__letter {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-size: calc(var(--size) * 0.4);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: 0.02em;
}

.lcard__sheen {
  position: absolute;
  inset: 0;
  background: radial-gradient(120px circle at var(--mx, 50%) var(--my, 50%), rgba(255, 255, 255, 0.26), transparent 62%);
  opacity: 0;
  transition: opacity 230ms ease;
  pointer-events: none;
}

.lcard:hover .lcard__sheen {
  opacity: 1;
}

.lcard__title {
  max-width: 108px;
  font-size: 13.5px;
  line-height: 1.35;
  color: var(--text-dim);
  text-align: center;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  transition: color 200ms ease;
}

.lcard--hero .lcard__title {
  max-width: 128px;
  font-size: 15px;
  color: var(--text);
}

.lcard--mini .lcard__title {
  max-width: 84px;
  font-size: 12px;
}

.lcard:hover .lcard__title {
  color: var(--text);
}

.lcard__tools {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transform: translateY(-6px) scale(0.9);
  transition:
    opacity 200ms var(--ease-out),
    transform 260ms var(--ease-spring);
  z-index: 2;
}

.lcard:hover .lcard__tools,
.lcard:focus-within .lcard__tools {
  opacity: 1;
  transform: none;
}

.lcard__tool {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: rgba(12, 14, 22, 0.82);
  border: 1px solid var(--stroke-strong);
  color: var(--text-dim);
  transition:
    transform var(--dur-fast) var(--ease-spring),
    color var(--dur-fast) ease,
    background var(--dur-fast) ease;
}

.lcard__tool:hover {
  transform: scale(1.14);
  color: var(--text);
  background: rgba(30, 36, 52, 0.92);
}

.lcard__tool--danger:hover {
  color: var(--danger);
}
</style>
