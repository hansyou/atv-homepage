<script setup lang="ts">
import { useUi } from '../../stores/ui'
import FolderEditor from './FolderEditor.vue'
import LinkEditor from './LinkEditor.vue'

const ui = useUi()
</script>

<template>
  <Teleport to="body">
    <Transition name="layer">
      <div v-if="ui.linkEditorOpen || ui.folderEditorOpen" class="editor-layer" @click.self="ui.closeEditor()">
        <div class="editor-modal" role="dialog" aria-modal="true">
          <button class="editor-modal__close" aria-label="关闭" @click="ui.closeEditor()">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <LinkEditor v-if="ui.linkEditorOpen" :link="ui.editingLink" @done="ui.closeEditor()" />
          <FolderEditor v-else :folder="ui.editingFolder" @done="ui.closeEditor()" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.editor-layer {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(5, 7, 12, 0.52);
}

.editor-modal {
  position: relative;
  width: min(460px, 100%);
  max-height: min(84vh, 720px);
  overflow: auto;
  padding: 30px;
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(30, 35, 52, 0.52), rgba(16, 19, 30, 0.66));
  border: 1px solid var(--stroke-strong);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  box-shadow: 0 50px 120px rgba(0, 0, 0, 0.6);
  transition:
    transform 340ms var(--ease-out),
    opacity 230ms var(--ease-out);
}

.editor-modal__close {
  position: absolute;
  top: 18px;
  right: 18px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  color: var(--text-dim);
  transition:
    color var(--dur-fast) ease,
    background var(--dur-fast) ease;
}

.editor-modal__close:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.08);
}

.layer-enter-from .editor-modal {
  opacity: 0;
  transform: scale(0.92) translateY(18px);
}

.layer-leave-to .editor-modal {
  opacity: 0;
  transform: scale(0.96) translateY(10px);
}
</style>
