<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    size?: 'sm' | 'md' | 'lg'
    /** Impede fechar (ex.: enquanto gera certificados). */
    locked?: boolean
  }>(),
  { size: 'md', description: '', locked: false },
)

const emit = defineEmits<{ close: [] }>()

const dialog = ref<HTMLElement | null>(null)
const titleId = `modal-${Math.random().toString(36).slice(2)}`
let previousFocus: HTMLElement | null = null

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function close() {
  if (!props.locked) emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return
  const items = [...dialog.value.querySelectorAll<HTMLElement>(FOCUSABLE)]
  if (items.length === 0) return
  const first = items[0]
  const last = items[items.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previousFocus = document.activeElement as HTMLElement | null
      document.body.style.overflow = 'hidden'
      await nextTick()
      const target = dialog.value?.querySelector<HTMLElement>('[autofocus]') ?? dialog.value?.querySelector<HTMLElement>(FOCUSABLE)
      target?.focus()
    } else {
      document.body.style.overflow = ''
      previousFocus?.focus()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="backdrop" @mousedown.self="close">
      <div
        ref="dialog"
        class="modal"
        :class="`modal--${size}`"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @keydown="onKeydown"
      >
        <header class="modal__header">
          <div>
            <h2 :id="titleId" class="modal__title">{{ title }}</h2>
            <p v-if="description" class="modal__description">{{ description }}</p>
          </div>
          <button v-if="!locked" type="button" class="btn btn--ghost btn--icon btn--sm" aria-label="Fechar" @click="close">
            <X :size="18" aria-hidden="true" />
          </button>
        </header>
        <div class="modal__body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="modal__footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--esp-4);
  background: rgba(27, 36, 48, 0.45);
}

.modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: calc(100vh - 2 * var(--esp-4));
  background: var(--cor-fundo);
  border-radius: var(--raio-lg);
  box-shadow: var(--sombra);
}

.modal--sm {
  max-width: 420px;
}

.modal--md {
  max-width: 560px;
}

.modal--lg {
  max-width: 760px;
}

.modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--esp-4);
  padding: var(--esp-5) var(--esp-5) var(--esp-3);
}

.modal__title {
  font-size: var(--texto-lg);
}

.modal__description {
  margin-top: var(--esp-1);
  color: var(--cor-texto-secundario);
}

.modal__body {
  padding: var(--esp-2) var(--esp-5) var(--esp-5);
  overflow-y: auto;
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--esp-2);
  padding: var(--esp-4) var(--esp-5);
  border-top: 1px solid var(--cor-borda);
}

@media (max-width: 480px) {
  .modal__footer > :deep(*) {
    flex: 1 1 100%;
  }
}
</style>
