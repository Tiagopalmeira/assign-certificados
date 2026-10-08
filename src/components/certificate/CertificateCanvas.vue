<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Maximize, Minus, Plus } from 'lucide-vue-next'
import { sampleValues } from '@/lib/fields'
import { useGraduationSystemsStore } from '@/stores/graduationSystems'
import { useTemplateEditor } from '@/composables/useTemplateEditor'
import CertificatePreview from './CertificatePreview.vue'
import CertificateField from './CertificateField.vue'

const editor = useTemplateEditor()
const template = editor.template

const viewport = ref<HTMLElement | null>(null)
const fitScale = ref(1)
/** null = ajustar à tela; número = zoom manual. */
const manualScale = ref<number | null>(null)
const scale = computed(() => manualScale.value ?? fitScale.value)
const zoomLabel = computed(() => `${Math.round((scale.value / fitScale.value) * 100)}%`)

const systems = useGraduationSystemsStore()
const values = computed(() => sampleValues(template.value.defaults, systems.fallback))

const PADDING = 48

function measure() {
  const el = viewport.value
  if (!el) return
  const width = el.clientWidth - PADDING
  const height = el.clientHeight - PADDING
  fitScale.value = Math.max(0.05, Math.min(width / template.value.width, height / template.value.height))
}

function zoom(factor: number) {
  manualScale.value = Math.min(fitScale.value * 4, Math.max(fitScale.value * 0.25, scale.value * factor))
}

let observer: ResizeObserver | null = null
onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (viewport.value) observer.observe(viewport.value)
})
onBeforeUnmount(() => observer?.disconnect())

function onBackgroundPointerDown(event: PointerEvent) {
  if (event.target === event.currentTarget) editor.selectedId.value = null
}
</script>

<template>
  <div class="canvas">
    <div ref="viewport" class="canvas__viewport" @pointerdown="onBackgroundPointerDown">
      <div
        class="canvas__page"
        :style="{ width: `${template.width * scale}px`, height: `${template.height * scale}px` }"
      >
        <CertificatePreview :template="template" :values="values" show-placeholders />
        <div class="canvas__overlay" @pointerdown="onBackgroundPointerDown">
          <CertificateField v-for="field in template.fields" :key="field.id" :field="field" :scale="scale" />
          <div v-if="editor.guides.vertical" class="guide guide--vertical" aria-hidden="true" />
          <div v-if="editor.guides.horizontal" class="guide guide--horizontal" aria-hidden="true" />
        </div>
      </div>
    </div>
    <div class="zoom" role="group" aria-label="Zoom">
      <button type="button" class="btn btn--ghost btn--icon btn--sm" aria-label="Diminuir zoom" @click="zoom(1 / 1.25)">
        <Minus :size="16" aria-hidden="true" />
      </button>
      <span class="zoom__value" aria-live="polite">{{ zoomLabel }}</span>
      <button type="button" class="btn btn--ghost btn--icon btn--sm" aria-label="Aumentar zoom" @click="zoom(1.25)">
        <Plus :size="16" aria-hidden="true" />
      </button>
      <button type="button" class="btn btn--ghost btn--icon btn--sm" aria-label="Ajustar à tela" title="Ajustar à tela" @click="manualScale = null">
        <Maximize :size="16" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.canvas {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.canvas__viewport {
  flex: 1;
  display: flex;
  min-height: 0;
  padding: var(--esp-6);
  overflow: auto;
}

.canvas__page {
  position: relative;
  flex-shrink: 0;
  margin: auto;
  box-shadow: 0 0 0 1px var(--cor-borda), 0 2px 8px rgba(27, 36, 48, 0.08);
}

.canvas__overlay {
  position: absolute;
  inset: 0;
}

.guide {
  position: absolute;
  pointer-events: none;
  background: var(--cor-erro);
}

.guide--vertical {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
}

.guide--horizontal {
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
}

.zoom {
  position: absolute;
  right: var(--esp-4);
  bottom: var(--esp-4);
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio);
  background: var(--cor-fundo);
}

.zoom__value {
  min-width: 44px;
  font-size: var(--texto-sm);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
</style>
