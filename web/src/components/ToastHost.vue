<script setup lang="ts">
import { useUi } from '../stores/ui'

const ui = useUi()
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-host">
      <div v-for="item in ui.toasts" :key="item.id" class="toast glass" :class="`is-${item.type}`" @click="ui.dismissToast(item.id)">
        <span class="toast__dot" />
        {{ item.text }}
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.toast-host {
  position: fixed;
  left: 50%;
  bottom: 34px;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transform: translateX(-50%);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 999px;
  font-size: 14px;
  color: var(--text);
  box-shadow: var(--shadow-card);
  pointer-events: auto;
  cursor: pointer;
}

.toast__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

.toast.is-success .toast__dot {
  background: #58e0a0;
}

.toast.is-error .toast__dot {
  background: var(--danger);
}

.toast-enter-active {
  transition: opacity 260ms var(--ease-out), transform 320ms var(--ease-spring);
}

.toast-leave-active {
  transition: opacity 180ms var(--ease-in-out), transform 200ms var(--ease-in-out);
  position: absolute;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(18px) scale(0.94);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.96);
}
</style>
