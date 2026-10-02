<script setup lang="ts">
import { computed } from 'vue'
import type { CertificateField, CertificateValues } from '@/types'
import { resolveFieldText, isMultiline } from '@/lib/fieldText'
import { layoutText } from '@/lib/textLayout'
import { signatureBoxes, type Box } from '@/lib/geometry'
import { FAUX_BOLD_STROKE } from '@/lib/fonts'
import { fieldLabel } from '@/lib/fields'
import { useFontsStore } from '@/stores/fonts'
import { useFilesStore } from '@/stores/files'

/**
 * Desenha um campo em SVG usando o mesmo layout do gerador de PDF.
 * Coordenadas em pontos do modelo.
 */
const props = defineProps<{
  field: CertificateField
  values: CertificateValues
  imageId: string | null
  /** No editor, mostra um contorno com o nome do campo quando ele está vazio. */
  showPlaceholder?: boolean
}>()

const fonts = useFontsStore()
const files = useFilesStore()

const text = computed(() => resolveFieldText(props.field, props.values))
const imageUrl = computed(() => files.urlFor(props.imageId))

const boxes = computed(() => {
  const full: Box = { x: 0, y: 0, width: props.field.width, height: props.field.height }
  if (props.field.type === 'signature') return signatureBoxes(props.field, Boolean(text.value))
  if (props.field.type === 'image') return { image: full, caption: null }
  return { image: null, caption: full }
})

const font = computed(() => {
  const { style } = props.field
  return fonts.renderFont(style.fontFamily, style.bold, style.italic)
})

const layout = computed(() => {
  const box = boxes.value.caption
  const metrics = font.value.metrics
  if (!box || !metrics || !text.value.trim() || box.height <= 0) return null
  const { style } = props.field
  return layoutText(
    {
      text: text.value,
      width: box.width,
      height: box.height,
      fontSize: style.fontSize,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      align: style.align,
      multiline: isMultiline(props.field),
      shrinkToFit: props.field.shrinkToFit,
    },
    metrics,
  )
})

const lines = computed(() => {
  const box = boxes.value.caption
  if (!layout.value || !box) return []
  return layout.value.lines
    .filter((line) => line.text)
    .map((line) => {
      const x = box.x + line.x
      const y = box.y + line.baseline
      return {
        text: line.text,
        x,
        y,
        transform: font.value.fauxItalic ? `translate(${x} ${y}) skewX(-12) translate(${-x} ${-y})` : undefined,
      }
    })
})

const transform = computed(() => {
  const f = props.field
  const rotation = f.rotation ? ` rotate(${f.rotation} ${f.width / 2} ${f.height / 2})` : ''
  return `translate(${f.x} ${f.y})${rotation}`
})

const placeholderLabel = computed(() => {
  if (!props.showPlaceholder) return ''
  if ((props.field.type === 'image' || props.field.type === 'signature') && !imageUrl.value) {
    return props.field.type === 'signature' ? 'Assinatura' : fieldLabel('image')
  }
  if (props.field.type !== 'image' && props.field.type !== 'signature' && !text.value.trim()) {
    return fieldLabel(props.field.type)
  }
  return ''
})

const placeholderFontSize = computed(() => Math.max(6, Math.min(props.field.height * 0.35, 14)))
</script>

<template>
  <g :transform="transform">
    <image
      v-if="boxes.image && imageUrl && boxes.image.height > 0"
      :href="imageUrl"
      :x="boxes.image.x"
      :y="boxes.image.y"
      :width="boxes.image.width"
      :height="boxes.image.height"
      preserveAspectRatio="xMidYMid meet"
    />
    <text
      v-for="(line, index) in lines"
      :key="index"
      :x="line.x"
      :y="line.y"
      :transform="line.transform"
      :font-family="font.cssFamily"
      :font-size="layout!.fontSize"
      :letter-spacing="layout!.letterSpacing"
      :fill="field.style.color"
      :stroke="font.fauxBold ? field.style.color : undefined"
      :stroke-width="font.fauxBold ? layout!.fontSize * FAUX_BOLD_STROKE : undefined"
      class="field-text"
    >{{ line.text }}</text>
    <g v-if="placeholderLabel" class="placeholder">
      <rect :width="field.width" :height="field.height" />
      <text :x="field.width / 2" :y="field.height / 2" :font-size="placeholderFontSize">{{ placeholderLabel }}</text>
    </g>
  </g>
</template>

<style scoped>
.field-text {
  white-space: pre;
  font-kerning: none;
}

.placeholder rect {
  fill: rgba(31, 58, 95, 0.06);
}

.placeholder text {
  fill: var(--cor-texto-secundario);
  font-family: var(--fonte);
  text-anchor: middle;
  dominant-baseline: central;
}
</style>
