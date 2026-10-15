<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Link } from '../../api/types'
import { useAuth } from '../../stores/auth'
import { useCatalog } from '../../stores/catalog'
import { useUi } from '../../stores/ui'
import { useDragSort } from '../../composables/useDragSort'
import LinkCard from './LinkCard.vue'

const catalog = useCatalog()
const ui = useUi()
const auth = useAuth()

const folder = computed(() => (ui.overlayFolderId ? catalog.folderOf(ui.overlayFolderId) : undefined))
const links = computed(() => (folder.value ? catalog.linksOf(folder.value.id) : []))
const editing = computed(() => auth.authed && ui.launchpadEditing)

type SortLink = Link & { key: string }

const items = computed<SortLink[]>(() => links.value.map((l) => ({ ...l, key: `l-${l.id}` })))

const gridEl = ref<HTMLElement | null>(null)

const { order, dragKey, styleFor, onPointerDown, onClickCapture } = useDragSort<SortLink>({
  container: gridEl,
  source: () => items.value,
  enabled: () => auth.authed && ui.launchpadEditing,
  armLongPress: () => auth.authed,
  onEnterEditMode: () => ui.setLaunchpadEditing(true),
  onCommit: async (ordered) => {
    if (!folder.value) return
    try {
      await catalog.applyFolderOrder(folder.value.id, ordered.map((it) => ({ id: it.id })))
    } catch (err) {
      ui.toast((err as Error).message, 'error')
    }
  },
})

function onEdit(link: Link) {
  ui.openLinkEditor(link)
}

async function onRemove(link: Link) {
  if (!(await ui.confirm(`确定删除「${link.title}」吗？`, { danger: true }))) return
  try {
    await catalog.removeLink(link.id)
    ui.toast('已删除', 'success')
  } catch (err) {
    ui.toast((err as Error).message, 'error')
  }
}

function close() {
  ui.openFolderOverlay(null)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="layer">
      <div v-if="folder" class="overlay" role="dialog" aria-modal="true" :aria-label="folder.name" @click.self="close">
        <section class="overlay__panel" data-lenis-prevent :style="{ '--folder-color': folder.color }">
          <header class="overlay__head">
            <div>
              <h2 class="overlay__title">{{ folder.name }}</h2>
              <p class="overlay__sub">{{ links.length }} 个网址</p>
            </div>
            <div class="overlay__actions">
              <button v-if="auth.authed" class="btn btn--sm" @click="ui.toggleLaunchpadEditing()">
                {{ editing ? '完成' : '编辑顺序' }}
              </button>
              <button class="btn btn--sm" @click="close">关闭</button>
            </div>
          </header>

          <div class="overlay__grid" ref="gridEl">
            <div
              v-for="(link, i) in order"
              :key="link.key"
              class="overlay__cell"
              :data-sort-key="link.key"
              :style="styleFor(link, { '--i': i % 12 })"
              :class="{ 'is-editing': editing, 'is-dragging': dragKey === link.key }"
              @pointerdown="onPointerDown($event, link)"
              @click.capture="onClickCapture"
              @dragstart.prevent
            >
              <LinkCard :link="link" variant="mini" :editable="auth.authed" :editing="editing" @edit="onEdit" @remove="onRemove" />
            </div>
            <p v-if="!order.length" class="overlay__empty">这个文件夹还是空的</p>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(5, 7, 12, 0.52);
  backdrop-filter: blur(28px) saturate(140%);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
}

.overlay__panel {
  width: min(760px, 100%);
  max-height: min(78vh, 720px);
  overflow: auto;
  padding: 30px 30px 34px;
  border-radius: 30px;
  background: linear-gradient(180deg, rgba(24, 28, 42, 0.86), rgba(16, 19, 30, 0.9));
  border: 1px solid var(--stroke-strong);
  box-shadow: 0 50px 120px rgba(0, 0, 0, 0.6);
  transition:
    transform 340ms var(--ease-out),
    opacity 230ms var(--ease-out);
  will-change: transform, opacity;
}

.overlay__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--stroke);
}

.overlay__title {
  margin: 0;
  font-size: 26px;
  font-weight: 650;
  letter-spacing: 0.01em;
  background: linear-gradient(120deg, var(--folder-color), #ffffff 120%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.overlay__sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-faint);
}

.overlay__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.overlay__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: 10px;
  padding-top: 22px;
}

.overlay__cell {
  position: relative;
  border-radius: var(--radius-lg);
  transition: transform 320ms var(--ease-spring);
  will-change: transform;
  -webkit-touch-callout: none;
}

.overlay__cell.is-editing {
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.overlay__cell.is-editing:active {
  cursor: grabbing;
}

.overlay__cell.is-dragging {
  z-index: 40;
  filter: drop-shadow(0 22px 34px rgba(0, 0, 0, 0.5));
}

.overlay__empty {
  grid-column: 1 / -1;
  padding: 32px 0;
  text-align: center;
  color: var(--text-faint);
  font-size: 14px;
}

/* 浮层打开：面板从中心放大浮出 */
.layer-enter-from .overlay__panel {
  opacity: 0;
  transform: scale(0.9) translateY(30px);
}

.layer-leave-to .overlay__panel {
  opacity: 0;
  transform: scale(0.94) translateY(16px);
}

@media (max-width: 560px) {
  .overlay__panel {
    padding: 22px 18px 26px;
    border-radius: 22px;
  }

  .overlay__title {
    font-size: 21px;
  }
}
</style>
