<script setup lang="ts">
import { computed } from 'vue'
import type { CertificateTemplate, CertificateValues } from '@/types'
import { useFilesStore } from '@/stores/files'
import FieldGraphic from './FieldGraphic.vue'

/**
 * Prévia do certificado em SVG. Ocupa 100% da largura do contêiner e mantém a proporção
 * da página. É o mesmo desenho usado no editor e nas miniaturas.
 */
const props = defineProps<{
  template: CertificateTemplate
  values: CertificateValues
  /** Imagem de assinatura a usar; por padrão, a do modelo. */
  signatureImageId?: string | null
  showPlaceholders?: boolean
  label?: string
}>()

const files = useFilesStore()
const backgroundUrl = computed(() => files.urlFor(props.template.backgroundId))
const signatureId = computed(() =>
  props.signatureImageId === undefined ? props.template.defaults.signatureImageId : props.signatureImageId,
)
</script>

<template>
  <svg
    class="certificate"
    :viewBox="`0 0 ${template.width} ${template.height}`"
    role="img"
    :aria-label="label ?? `Prévia do certificado ${template.name}`"
  >
    <rect :width="template.width" :height="template.height" fill="#fff" />
    <image
      v-if="backgroundUrl"
      :href="backgroundUrl"
      :width="template.width"
      :height="template.height"
      preserveAspectRatio="none"
    />
    <FieldGraphic
      v-for="field in template.fields"
      :key="field.id"
      :field="field"
      :values="values"
      :image-id="field.type === 'signature' ? signatureId : field.imageId"
      :show-placeholder="showPlaceholders"
    />
  </svg>
</template>

<style scoped>
.certificate {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
}
</style>
