<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Folder, Link } from '../../api/types'
import type { GridItem } from '../../stores/catalog'
import { useAuth } from '../../stores/auth'
import { useCatalog } from '../../stores/catalog'
import { useUi } from '../../stores/ui'
import { useDragSort } from '../../composables/useDragSort'
import FolderCard from '../cards/FolderCard.vue'
import LinkCard from '../cards/LinkCard.vue'

const catalog = useCatalog()
const ui = useUi()
const auth = useAuth()

const gridEl = ref<HTMLElement | null>(null)
const editing = computed(() => auth.authed && ui.launchpadEditing)

const { order, dragKey, dropKey, styleFor, onPointerDown, onClickCapture } = useDragSort<GridItem>({
  container: gridEl,
  source: () => catalog.topLevel,
  enabled: () => auth.authed && ui.launchpadEditing,
  armLongPress: () => auth.authed,
  onEnterEditMode: () => ui.setLaunchpadEditing(true),
  onCommit: async (ordered) => {
    try {
      await catalog.applyOrder(ordered)
    } catch (err) {
      ui.toast((err as Error).message, 'error')
    }
  },
  canDropOn: (drag, over) => drag.type === 'link' && over.type === 'folder',
  onDropOn: async (drag, over) => {
    if (drag.type !== 'link' || over.type !== 'folder') return
    try {
      await catalog.moveLinkToFolder(drag.link.id, over.folder.id)
      ui.toast(`已移入「${over.folder.name}」`, 'success')
    } catch (err) {
      ui.toast((err as Error).message, 'error')
    }
  },
})

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
  <div class="grid" ref="gridEl" @click.self="editing && ui.setLaunchpadEditing(false)">
    <template v-for="(item, i) in order" :key="item.key">
      <div
        class="grid__cell reveal"
        v-intersect
        :data-sort-key="item.key"
        :style="styleFor(item, { '--i': i % 12 })"
        :class="{
          'is-editing': editing,
          'is-dragging': dragKey === item.key,
          'is-drop-target': dropKey === item.key,
        }"
        @pointerdown="onPointerDown($event, item)"
        @click.capture="onClickCapture"
        @dragstart.prevent
      >
        <FolderCard
          v-if="item.type === 'folder'"
          :folder="item.folder"
          :links="catalog.linksOf(item.folder.id)"
          :editable="auth.authed"
          :editing="editing"
          @open="ui.openFolderOverlay($event.id)"
          @edit="onEditFolder"
          @remove="onRemoveFolder"
        />
        <LinkCard
          v-else
          :link="item.link"
          :editable="auth.authed"
          :editing="editing"
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

    <p v-if="!order.length && !auth.authed" class="grid__empty">
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
  -webkit-touch-callout: none;
}

.grid__cell.is-editing {
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.grid__cell.is-editing:active {
  cursor: grabbing;
}

.grid__cell.is-dragging {
  z-index: 40;
  filter: drop-shadow(0 22px 34px rgba(0, 0, 0, 0.5));
}

.grid__cell.is-drop-target {
  transform: scale(1.08);
}

.grid__cell.is-drop-target::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: var(--radius-lg);
  border: 2px dashed rgba(127, 178, 255, 0.7);
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
