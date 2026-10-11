<script setup lang="ts">
import { useUi } from '../stores/ui'

const ui = useUi()
</script>

<template>
  <Teleport to="body">
    <Transition name="layer">
      <div v-if="ui.confirmState.open" class="confirm" role="dialog" aria-modal="true" @click.self="ui.answerConfirm(false)">
        <div class="confirm__panel">
          <p class="confirm__text">{{ ui.confirmState.text }}</p>
          <div class="confirm__actions">
            <button class="btn" @click="ui.answerConfirm(false)">取消</button>
            <button class="btn" :class="ui.confirmState.danger ? 'btn--danger' : 'btn--primary'" @click="ui.answerConfirm(true)">
              确定
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(5, 7, 12, 0.55);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
}

.confirm__panel {
  width: min(420px, 100%);
  padding: 28px;
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(28, 32, 46, 0.94), rgba(18, 21, 32, 0.96));
  border: 1px solid var(--stroke-strong);
  box-shadow: 0 40px 90px rgba(0, 0, 0, 0.55);
  transition: transform 320ms var(--ease-out), opacity 220ms var(--ease-out);
}

.confirm__text {
  margin: 0 0 22px;
  font-size: 16px;
  line-height: 1.6;
  color: var(--text);
}

.confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.layer-enter-from .confirm__panel {
  opacity: 0;
  transform: scale(0.92) translateY(18px);
}

.layer-leave-to .confirm__panel {
  opacity: 0;
  transform: scale(0.96) translateY(10px);
}
</style>
