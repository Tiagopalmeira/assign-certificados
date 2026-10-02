<script setup lang="ts">
import { CircleAlert, CircleCheck, Info, X } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const icons = { success: CircleCheck, error: CircleAlert, info: Info }
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="toast in ui.toasts" :key="toast.id" class="toast" :class="`toast--${toast.tone}`" :role="toast.tone === 'error' ? 'alert' : 'status'">
        <component :is="icons[toast.tone]" :size="18" class="toast__icon" aria-hidden="true" />
        <span class="toast__message">{{ toast.message }}</span>
        <button type="button" class="toast__close" aria-label="Fechar aviso" @click="ui.dismiss(toast.id)">
          <X :size="16" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  right: var(--esp-4);
  bottom: var(--esp-4);
  left: var(--esp-4);
  z-index: 60;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--esp-2);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--esp-2);
  max-width: 420px;
  padding: var(--esp-3) var(--esp-3) var(--esp-3) var(--esp-4);
  background: var(--cor-texto);
  color: var(--cor-texto-inverso);
  border-radius: var(--raio);
  box-shadow: var(--sombra);
  font-size: var(--texto-sm);
  pointer-events: auto;
}

.toast__icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.toast--success .toast__icon {
  color: #7fd3a5;
}

.toast--error .toast__icon {
  color: #f5a39b;
}

.toast__message {
  flex: 1;
  line-height: var(--altura-linha);
}

.toast__close {
  display: inline-flex;
  padding: 2px;
  border: 0;
  border-radius: var(--raio-sm);
  background: none;
  color: inherit;
  cursor: pointer;
  opacity: 0.75;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity var(--transicao), transform var(--transicao);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
