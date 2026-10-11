<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Folder, Link } from '../../api/types'
import { faviconSrc, firstGlyph, placeholderStyle } from '../../utils/favicon'

const props = withDefaults(
  defineProps<{
    folder: Folder
    links: Link[]
    editable?: boolean
  }>(),
  { editable: false },
)

const emit = defineEmits<{ open: [folder: Folder]; edit: [folder: Folder]; remove: [folder: Folder] }>()

const failed = ref<Record<string, boolean>>({})

const preview = computed(() => props.links.slice(0, 4))

function iconOf(link: Link): string {
  return failed.value[link.id] ? '' : faviconSrc(link)
}

function onMove(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${(((e.clientX - rect.left) / rect.width) * 100).toFixed(2)}%`)
  el.style.setProperty('--my', `${(((e.clientY - rect.top) / rect.height) * 100).toFixed(2)}%`)
}
</script>

<template>
  <div
    class="fcard"
    role="button"
    tabindex="0"
    :style="{ '--folder-color': folder.color }"
    @click="emit('open', folder)"
    @keydown.enter.prevent="emit('open', folder)"
    @keydown.space.prevent="emit('open', folder)"
    @pointermove="onMove"
  >
    <span class="fcard__glow" aria-hidden="true" />
    <div class="fcard__media">
      <div class="fcard__stack" :class="{ 'is-empty': preview.length === 0 }">
        <span v-for="(link, i) in preview" :key="link.id" class="fcard__cell" :style="{ '--i': i }">
          <img v-if="iconOf(link)" :src="iconOf(link)" alt="" loading="lazy" @error="failed[link.id] = true" />
          <span v-else class="fcard__letter" :style="placeholderStyle(link.title)">{{ firstGlyph(link.title) }}</span>
        </span>
        <span v-for="i in Math.max(0, 4 - preview.length)" :key="`empty-${i}`" class="fcard__cell fcard__cell--empty" />
      </div>
      <span class="fcard__sheen" aria-hidden="true" />
    </div>

    <div class="fcard__meta">
      <div class="fcard__name">{{ folder.name }}</div>
      <div class="fcard__count">{{ links.length }} 个网址</div>
    </div>

    <div v-if="editable" class="fcard__tools">
      <button class="fcard__tool" aria-label="编辑文件夹" @click.stop="emit('edit', folder)">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
      <button class="fcard__tool fcard__tool--danger" aria-label="删除文件夹" @click.stop="emit('remove', folder)">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.fcard {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px 12px 18px;
  border-radius: var(--radius-lg);
  cursor: pointer;
  isolation: isolate;
  transition: transform 320ms var(--ease-spring);
  will-change: transform;
}

.fcard:hover {
  transform: translateY(-3px);
}

.fcard:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}

.fcard__glow {
  position: absolute;
  inset: 8% 12% 26%;
  z-index: -1;
  border-radius: 50%;
  background: radial-gradient(circle, var(--folder-color), transparent 72%);
  filter: blur(26px);
  opacity: 0;
  transform: scale(0.7);
  transition:
    opacity 320ms var(--ease-out),
    transform 380ms var(--ease-spring);
}

.fcard:hover .fcard__glow {
  opacity: 0.55;
  transform: scale(1);
}

.fcard__media {
  position: relative;
  width: 66px;
  height: 66px;
  border-radius: 21px;
  padding: 8px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--folder-color) 26%, rgba(255, 255, 255, 0.06)), rgba(255, 255, 255, 0.05));
  border: 1px solid color-mix(in srgb, var(--folder-color) 42%, transparent);
  box-shadow: var(--shadow-card);
  transition:
    transform 340ms var(--ease-spring),
    box-shadow 300ms var(--ease-out),
    border-color 200ms ease;
}

.fcard:hover .fcard__media {
  transform: scale(1.08) translateY(-7px);
  box-shadow: var(--shadow-card-hover);
}

.fcard__stack {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 5px;
  width: 100%;
  height: 100%;
}

.fcard__cell {
  display: grid;
  place-items: center;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
  transform: scale(1);
  transition: transform 320ms var(--ease-spring);
}

.fcard:hover .fcard__cell {
  transform: scale(1.06);
}

.fcard:hover .fcard__cell:nth-child(2) {
  transition-delay: 30ms;
}

.fcard:hover .fcard__cell:nth-child(3) {
  transition-delay: 60ms;
}

.fcard:hover .fcard__cell:nth-child(4) {
  transition-delay: 90ms;
}

.fcard__cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fcard__cell--empty {
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.1);
}

.fcard__letter {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}

.fcard__sheen {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(110px circle at var(--mx, 50%) var(--my, 50%), rgba(255, 255, 255, 0.24), transparent 62%);
  opacity: 0;
  transition: opacity 230ms ease;
  pointer-events: none;
}

.fcard:hover .fcard__sheen {
  opacity: 1;
}

.fcard__meta {
  text-align: center;
}

.fcard__name {
  font-size: 13.5px;
  color: var(--text);
  line-height: 1.35;
  max-width: 108px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.fcard__count {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--text-faint);
}

.fcard__tools {
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

.fcard:hover .fcard__tools,
.fcard:focus-within .fcard__tools {
  opacity: 1;
  transform: none;
}

.fcard__tool {
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
    color var(--dur-fast) ease;
}

.fcard__tool:hover {
  transform: scale(1.14);
  color: var(--text);
}

.fcard__tool--danger:hover {
  color: var(--danger);
}
</style>
