<script setup lang="ts">
import { computed } from 'vue'
import type { CertificateTemplate } from '@/types'
import { formatDate } from '@/lib/dates'
import { useLotStore } from '@/stores/lot'

/** Dados gerais do lote, exibidos uma única vez acima dos alunos e da revisão. */
const props = defineProps<{ template: CertificateTemplate; editable?: boolean }>()
const emit = defineEmits<{ edit: [] }>()

const lot = useLotStore()
const batch = computed(() => lot.toBatch(props.template))
const signatureText = computed(() => {
  const name = batch.value.signerName || 'Sem nome'
  const hasSignatureField = props.template.fields.some((f) => f.type === 'signature')
  if (!hasSignatureField) return name
  return batch.value.signatureId ? `${name} (com imagem)` : `${name} (sem imagem)`
})
</script>

<template>
  <section class="summary surface" aria-label="Dados do evento">
    <dl class="summary__list">
      <div>
        <dt>Modelo</dt>
        <dd>{{ template.name }}</dd>
      </div>
      <div>
        <dt>Data</dt>
        <dd>{{ formatDate(batch.date) || 'Sem data' }}</dd>
      </div>
      <div>
        <dt>Local</dt>
        <dd>{{ batch.location || 'Sem local' }}</dd>
      </div>
      <div>
        <dt>Assinatura</dt>
        <dd>{{ signatureText }}</dd>
      </div>
    </dl>
    <button v-if="editable" type="button" class="btn btn--link" @click="emit('edit')">Alterar dados do evento</button>
  </section>
</template>

<style scoped>
.summary {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--esp-3) var(--esp-5);
  padding: var(--esp-4) var(--esp-5);
}

.summary__list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--esp-3) var(--esp-6);
  flex: 1;
  margin: 0;
}

.summary__list dt {
  font-size: var(--texto-sm);
  color: var(--cor-texto-secundario);
}

.summary__list dd {
  margin: 2px 0 0;
  font-weight: var(--peso-medio);
  overflow-wrap: anywhere;
}
</style>
