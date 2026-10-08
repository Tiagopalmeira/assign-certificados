<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { CertificateTemplate } from '@/types'
import { formatDateTime } from '@/lib/dates'
import { sampleValues } from '@/lib/fields'
import { useGraduationSystemsStore } from '@/stores/graduationSystems'
import CertificatePreview from '@/components/certificate/CertificatePreview.vue'

const props = defineProps<{ template: CertificateTemplate }>()
const emit = defineEmits<{ duplicate: []; remove: [] }>()

const systems = useGraduationSystemsStore()
const values = computed(() => sampleValues(props.template.defaults, systems.resolve(props.template.defaults.graduationSystemId)))
const created = computed(() => formatDateTime(props.template.createdAt))
const updated = computed(() => formatDateTime(props.template.updatedAt))
</script>

<template>
  <article class="card surface">
    <RouterLink :to="`/modelos/${template.id}/editar`" class="card__thumb" :aria-label="`Editar ${template.name}`">
      <CertificatePreview :template="template" :values="values" :label="`Miniatura de ${template.name}`" />
    </RouterLink>
    <div class="card__body">
      <h2 class="card__title">{{ template.name }}</h2>
      <dl class="card__dates">
        <div>
          <dt>Criado em</dt>
          <dd>{{ created }}</dd>
        </div>
        <div>
          <dt>Atualizado em</dt>
          <dd>{{ updated }}</dd>
        </div>
      </dl>
      <RouterLink :to="`/modelos/${template.id}/lote`" class="btn btn--secondary card__use">Usar modelo</RouterLink>
      <div class="card__actions">
        <RouterLink :to="`/modelos/${template.id}/editar`" class="btn btn--ghost btn--sm">Editar</RouterLink>
        <button type="button" class="btn btn--ghost btn--sm" @click="emit('duplicate')">Duplicar</button>
        <button type="button" class="btn btn--ghost btn--sm card__delete" @click="emit('remove')">Excluir</button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card__thumb {
  display: block;
  padding: var(--esp-3);
  background: var(--cor-fundo-alt);
  border-bottom: 1px solid var(--cor-borda);
}

.card__thumb :deep(svg) {
  border-radius: var(--raio-sm);
  box-shadow: 0 0 0 1px var(--cor-borda);
}

.card__body {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  padding: var(--esp-4);
}

.card__title {
  font-size: var(--texto-md);
  overflow-wrap: anywhere;
}

.card__dates {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  font-size: var(--texto-sm);
  color: var(--cor-texto-secundario);
}

.card__dates div {
  display: flex;
  gap: var(--esp-1);
}

.card__dates dd {
  margin: 0;
}

.card__use {
  margin-top: var(--esp-1);
}

.card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-1);
  margin: 0 calc(-1 * var(--esp-3));
}

.card__delete {
  color: var(--cor-erro);
}
</style>
