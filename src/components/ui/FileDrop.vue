<script setup lang="ts">
import { ref } from 'vue'
import { Upload } from 'lucide-vue-next'

/** Área para escolher ou arrastar um arquivo. */
const props = withDefaults(
  defineProps<{
    accept: string
    label: string
    help?: string
    fileName?: string
    disabled?: boolean
    compact?: boolean
  }>(),
  { help: '', fileName: '', disabled: false, compact: false },
)

const emit = defineEmits<{ select: [file: File] }>()

const input = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const inputId = `file-${Math.random().toString(36).slice(2)}`

function onChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) emit('select', file)
  if (input.value) input.value.value = ''
}

function onDrop(event: DragEvent) {
  dragging.value = false
  if (props.disabled) return
  const file = event.dataTransfer?.files?.[0]
  if (file) emit('select', file)
}
</script>

<template>
  <div
    class="drop"
    :class="{ 'drop--active': dragging, 'drop--compact': compact, 'drop--disabled': disabled }"
    @dragover.prevent="dragging = !disabled"
    @dragleave="dragging = false"
    @drop.prevent="onDrop"
  >
    <input :id="inputId" ref="input" type="file" class="visually-hidden" :accept="accept" :disabled="disabled" @change="onChange" />
    <label :for="inputId" class="drop__label">
      <Upload :size="compact ? 18 : 22" aria-hidden="true" class="drop__icon" />
      <span class="drop__text">
        <span class="drop__title">{{ fileName || label }}</span>
        <span v-if="help" class="drop__help">{{ fileName ? 'Clique para trocar o arquivo' : help }}</span>
      </span>
    </label>
  </div>
</template>

<style scoped>
.drop {
  border: 1px dashed var(--cor-borda);
  border-radius: var(--raio);
  background: var(--cor-fundo-alt);
  transition: border-color var(--transicao), background-color var(--transicao);
}

.drop:hover,
.drop--active {
  border-color: var(--cor-primaria);
  background: var(--cor-primaria-suave);
}

.drop:focus-within {
  outline: 2px solid var(--cor-primaria);
  outline-offset: 2px;
}

.drop--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.drop__label {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  padding: var(--esp-5);
  cursor: pointer;
}

.drop--compact .drop__label {
  padding: var(--esp-3);
}

.drop__icon {
  flex-shrink: 0;
  color: var(--cor-primaria);
}

.drop__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.drop__title {
  font-weight: var(--peso-medio);
  overflow-wrap: anywhere;
}

.drop__help {
  font-size: var(--texto-sm);
  color: var(--cor-texto-secundario);
}
</style>
