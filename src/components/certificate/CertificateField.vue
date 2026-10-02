<script setup lang="ts">
import { computed } from 'vue'
import type { CertificateField } from '@/types'
import { fieldLabel } from '@/lib/fields'
import { rotatePoint } from '@/lib/geometry'
import { useTemplateEditor } from '@/composables/useTemplateEditor'

/** Caixa interativa sobre o certificado: seleciona, arrasta e redimensiona um campo. */
const props = defineProps<{
  field: CertificateField
  /** Pixels de tela por ponto do modelo. */
  scale: number
}>()

const editor = useTemplateEditor()
const selected = computed(() => editor.selectedId.value === props.field.id)

const MIN_SIZE = 6
const SNAP_PX = 6

const HANDLES = [
  { id: 'nw', hx: -1, hy: -1 },
  { id: 'n', hx: 0, hy: -1 },
  { id: 'ne', hx: 1, hy: -1 },
  { id: 'e', hx: 1, hy: 0 },
  { id: 'se', hx: 1, hy: 1 },
  { id: 's', hx: 0, hy: 1 },
  { id: 'sw', hx: -1, hy: 1 },
  { id: 'w', hx: -1, hy: 0 },
] as const

const style = computed(() => ({
  left: `${props.field.x * props.scale}px`,
  top: `${props.field.y * props.scale}px`,
  width: `${props.field.width * props.scale}px`,
  height: `${props.field.height * props.scale}px`,
  transform: props.field.rotation ? `rotate(${props.field.rotation}deg)` : undefined,
}))

function startPointer(event: PointerEvent, onMove: (dx: number, dy: number) => void) {
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture(event.pointerId)
  const startX = event.clientX
  const startY = event.clientY
  let moved = false

  const move = (e: PointerEvent) => {
    const dx = (e.clientX - startX) / props.scale
    const dy = (e.clientY - startY) / props.scale
    if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 2) return
    moved = true
    onMove(dx, dy)
  }
  const end = () => {
    target.removeEventListener('pointermove', move)
    target.removeEventListener('pointerup', end)
    target.removeEventListener('pointercancel', end)
    editor.guides.vertical = false
    editor.guides.horizontal = false
    if (moved) editor.commit()
  }
  target.addEventListener('pointermove', move)
  target.addEventListener('pointerup', end)
  target.addEventListener('pointercancel', end)
}

function onBoxPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  editor.selectedId.value = props.field.id
  const { x: x0, y: y0, width, height } = props.field
  const page = editor.template.value
  const snap = SNAP_PX / props.scale

  startPointer(event, (dx, dy) => {
    let x = x0 + dx
    let y = y0 + dy
    const centerX = x + width / 2
    const centerY = y + height / 2
    editor.guides.vertical = Math.abs(centerX - page.width / 2) < snap
    editor.guides.horizontal = Math.abs(centerY - page.height / 2) < snap
    if (editor.guides.vertical) x = page.width / 2 - width / 2
    if (editor.guides.horizontal) y = page.height / 2 - height / 2
    editor.updateField(props.field.id, { x, y })
  })
}

function onHandlePointerDown(event: PointerEvent, hx: number, hy: number) {
  if (event.button !== 0) return
  event.stopPropagation()
  const { x, y, width: w0, height: h0, rotation } = props.field
  const cx0 = x + w0 / 2
  const cy0 = y + h0 / 2

  startPointer(event, (dx, dy) => {
    // Converte o movimento para o eixo do campo (que pode estar girado).
    const local = rotatePoint(dx, dy, -rotation)
    const width = Math.max(MIN_SIZE, w0 + hx * local.x)
    const height = Math.max(MIN_SIZE, h0 + hy * local.y)
    // Mantém fixo o lado/canto oposto à alça.
    const shift = rotatePoint((hx * (width - w0)) / 2, (hy * (height - h0)) / 2, rotation)
    const cx = cx0 + shift.x
    const cy = cy0 + shift.y
    editor.updateField(props.field.id, { x: cx - width / 2, y: cy - height / 2, width, height })
  })
}
</script>

<template>
  <div
    class="box"
    :class="{ 'box--selected': selected }"
    :style="style"
    role="button"
    tabindex="0"
    :aria-label="`Campo ${fieldLabel(field.type)}`"
    :aria-pressed="selected"
    @pointerdown="onBoxPointerDown"
    @focus="editor.selectedId.value = field.id"
  >
    <span v-if="selected" class="box__label">{{ fieldLabel(field.type) }}</span>
    <template v-if="selected">
      <span
        v-for="handle in HANDLES"
        :key="handle.id"
        class="handle"
        :class="`handle--${handle.id}`"
        aria-hidden="true"
        @pointerdown="onHandlePointerDown($event, handle.hx, handle.hy)"
      />
    </template>
  </div>
</template>

<style scoped>
.box {
  position: absolute;
  box-sizing: border-box;
  border: 1px dashed rgba(31, 58, 95, 0.45);
  cursor: move;
  touch-action: none;
  transform-origin: center;
}

.box:hover {
  border-style: solid;
  border-color: var(--cor-primaria);
}

.box:focus-visible {
  outline: 2px solid var(--cor-primaria);
  outline-offset: 2px;
}

.box--selected {
  border: 1.5px solid var(--cor-primaria);
}

.box__label {
  position: absolute;
  bottom: 100%;
  left: -1.5px;
  margin-bottom: 4px;
  padding: 2px var(--esp-2);
  border-radius: var(--raio-sm);
  background: var(--cor-primaria);
  color: var(--cor-texto-inverso);
  font-size: var(--texto-xs);
  font-weight: var(--peso-medio);
  white-space: nowrap;
  pointer-events: none;
}

.handle {
  position: absolute;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -5px;
  border: 1.5px solid var(--cor-primaria);
  border-radius: 2px;
  background: var(--cor-fundo);
  touch-action: none;
}

/* Alvo de toque maior que o quadradinho visível */
.handle::after {
  content: '';
  position: absolute;
  inset: -8px;
}

.handle--nw { left: 0; top: 0; cursor: nwse-resize; }
.handle--n { left: 50%; top: 0; cursor: ns-resize; }
.handle--ne { left: 100%; top: 0; cursor: nesw-resize; }
.handle--e { left: 100%; top: 50%; cursor: ew-resize; }
.handle--se { left: 100%; top: 100%; cursor: nwse-resize; }
.handle--s { left: 50%; top: 100%; cursor: ns-resize; }
.handle--sw { left: 0; top: 100%; cursor: nesw-resize; }
.handle--w { left: 0; top: 50%; cursor: ew-resize; }
</style>
