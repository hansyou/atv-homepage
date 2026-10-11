<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Folder, Link } from '../../api/types'
import type { GridItem } from '../../stores/catalog'
import { useAuth } from '../../stores/auth'
import { useCatalog } from '../../stores/catalog'
import { useUi } from '../../stores/ui'
import FolderCard from '../cards/FolderCard.vue'
import LinkCard from '../cards/LinkCard.vue'

const catalog = useCatalog()
const ui = useUi()
const auth = useAuth()

const dragIndex = ref(-1)
const overIndex = ref(-1)
const dragging = ref(false)

const items = computed<GridItem[]>(() => catalog.topLevel)

function resetDrag(): void {
  dragging.value = false
  dragIndex.value = -1
  overIndex.value = -1
}

function onDragStart(e: DragEvent, index: number): void {
  if (!auth.authed) return
  dragging.value = true
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(e: DragEvent, index: number): void {
  if (!dragging.value) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  overIndex.value = index
}

async function onDropAt(e: DragEvent, index: number): Promise<void> {
  if (!dragging.value) return
  e.preventDefault()
  const from = dragIndex.value
  resetDrag()
  if (from < 0 || from === index) return
  try {
    const next = [...items.value]
    const [moved] = next.splice(from, 1)
    next.splice(index, 0, moved)
    await catalog.applyOrder(next)
  } catch (err) {
    ui.toast((err as Error).message, 'error')
  }
}

/** 把网址拖进文件夹 */
async function onDropOnFolder(e: DragEvent, folder: Folder): Promise<void> {
  if (!dragging.value) return
  e.preventDefault()
  e.stopPropagation()
  const item = items.value[dragIndex.value]
  resetDrag()
  if (!item || item.type !== 'link') return
  try {
    await catalog.moveLinkToFolder(item.link.id, folder.id)
    ui.toast(`已移入「${folder.name}」`, 'success')
  } catch (err) {
    ui.toast((err as Error).message, 'error')
  }
}

async function onEditLink(link: Link): Promise<void> {
  ui.openLinkEditor(link)
}

async function onRemoveLink(link: Link): Promise<void> {
  if (!(await ui.confirm(`确定删除「${link.title}」吗？`, { danger: true }))) return
  try {
    await catalog.removeLink(link.id)
    ui.toast('已删除', 'success')
  } catch (err) {
    ui.toast((err as Error).message, 'error')
  }
}

async function onEditFolder(folder: Folder): Promise<void> {
  ui.openFolderEditor(folder)
}

async function onRemoveFolder(folder: Folder): Promise<void> {
  const count = catalog.linksOf(folder.id).length
  const tip = count ? `文件夹内有 ${count} 个网址，删除后网址会移出到启动台。` : ''
  if (!(await ui.confirm(`确定删除「${folder.name}」吗？${tip}`, { danger: true }))) return
  try {
    await catalog.removeFolder(folder.id)
    ui.toast('文件夹已删除', 'success')
  } catch (err) {
    ui.toast((err as Error).message, 'error')
  }
}
</script>

<template>
  <div class="grid">
    <template v-for="(item, i) in items" :key="item.key">
      <div
        class="grid__cell reveal"
        v-intersect
        :class="{ 'is-over': overIndex === i && dragIndex !== i, 'is-dragging': dragIndex === i, 'is-grabbable': auth.authed }"
        :style="{ '--i': i % 12 }"
        :draggable="auth.authed"
        @dragstart="onDragStart($event, i)"
        @dragover="onDragOver($event, i)"
        @drop="onDropAt($event, i)"
        @dragend="resetDrag"
      >
        <FolderCard
          v-if="item.type === 'folder'"
          :folder="item.folder"
          :links="catalog.linksOf(item.folder.id)"
          :editable="auth.authed"
          @open="ui.openFolderOverlay($event.id)"
          @edit="onEditFolder"
          @remove="onRemoveFolder"
          @dragover.stop="onDragOver($event, i)"
          @drop.stop="onDropOnFolder($event, item.folder)"
        />
        <LinkCard
          v-else
          :link="item.link"
          :editable="auth.authed"
          @edit="onEditLink"
          @remove="onRemoveLink"
        />
      </div>
    </template>

    <template v-if="auth.authed">
      <button class="grid__add reveal" v-intersect style="--i: 0" @click="ui.openLinkEditor(null)">
        <span class="grid__add-icon">＋</span>
        新建网址
      </button>
      <button class="grid__add reveal" v-intersect style="--i: 1" @click="ui.openFolderEditor(null)">
        <span class="grid__add-icon">＋</span>
        新建文件夹
      </button>
    </template>

    <p v-if="!items.length && !auth.authed" class="grid__empty">
      启动台还是空的 — 点击右上角「管理」登录后添加网址
    </p>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(116px, 1fr));
  gap: clamp(6px, 1.4vw, 18px);
  justify-items: center;
  width: 100%;
}

.grid__cell {
  position: relative;
  width: 100%;
  max-width: 152px;
  border-radius: var(--radius-lg);
  transition:
    transform 320ms var(--ease-spring),
    opacity 320ms var(--ease-out);
  will-change: transform;
}

.grid__cell.is-grabbable {
  cursor: grab;
}

.grid__cell.is-dragging {
  opacity: 0.28;
  transform: scale(0.94);
}

.grid__cell.is-over {
  transform: scale(1.06);
}

.grid__cell.is-over::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: var(--radius-lg);
  border: 2px dashed rgba(127, 178, 255, 0.6);
  animation: pulse 0.9s var(--ease-in-out) infinite;
  pointer-events: none;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

.grid__add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  max-width: 152px;
  min-height: 132px;
  border-radius: var(--radius-lg);
  border: 1.5px dashed var(--stroke-strong);
  color: var(--text-faint);
  font-size: 13px;
  transition:
    color var(--dur-fast) ease,
    border-color var(--dur-fast) ease,
    background var(--dur-fast) ease,
    transform 320ms var(--ease-spring);
}

.grid__add:hover {
  color: var(--text);
  border-color: rgba(127, 178, 255, 0.55);
  background: rgba(127, 178, 255, 0.08);
  transform: translateY(-3px) scale(1.02);
}

.grid__add-icon {
  font-size: 26px;
  line-height: 1;
  opacity: 0.85;
}

.grid__empty {
  grid-column: 1 / -1;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-faint);
  font-size: 14px;
}
</style>
