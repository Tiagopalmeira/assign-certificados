<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { CertificateTemplate, CertificateValues } from '@/types'
import { useLotStore } from '@/stores/lot'
import EventSummary from './EventSummary.vue'
import CertificatePreview from '@/components/certificate/CertificatePreview.vue'

const props = defineProps<{ template: CertificateTemplate }>()
const emit = defineEmits<{ back: []; editEvent: []; finish: [] }>()

const lot = useLotStore()
const batch = computed(() => lot.toBatch(props.template))
const students = computed(() => batch.value.students)
const current = ref(0)

watch(students, (list) => {
  if (current.value >= list.length) current.value = Math.max(0, list.length - 1)
})

const previewValues = computed<CertificateValues>(() => {
  const student = students.value[current.value] ?? { name: '', graduation: '' }
  return {
    name: student.name,
    graduation: student.graduation,
    date: batch.value.date,
    location: batch.value.location,
    signerName: batch.value.signerName,
  }
})

const plural = (count: number) => (count === 1 ? '1 aluno' : `${count} alunos`)
</script>

<template>
  <div class="step">
    <EventSummary :template="template" editable @edit="emit('editEvent')" />

    <div class="layout">
      <div class="layout__main">
        <section class="surface block" aria-labelledby="summary-title">
          <h2 id="summary-title" class="section-title">Resumo do lote</h2>
          <p class="total">
            Total de certificados: <strong>{{ students.length }}</strong>
          </p>
          <ul class="counts">
            <li v-for="item in lot.summary" :key="item.graduation">
              <span>{{ item.graduation }}</span>
              <span class="muted">{{ plural(item.count) }}</span>
            </li>
          </ul>
        </section>

        <section class="surface block" aria-labelledby="list-title">
          <h2 id="list-title" class="section-title">Lista completa</h2>
          <p class="muted small">Clique em um nome para ver a prévia do certificado.</p>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Graduação</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(student, index) in students"
                  :key="index"
                  class="row"
                  :class="{ 'row--active': index === current }"
                >
                  <td>
                    <button type="button" class="row__button" :aria-current="index === current" @click="current = index">
                      {{ student.name }}
                    </button>
                  </td>
                  <td>{{ student.graduation }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section class="layout__preview" aria-labelledby="preview-title">
        <div class="preview-header">
          <h2 id="preview-title" class="section-title">Prévia do certificado</h2>
          <div class="pager">
            <button type="button" class="btn btn--ghost btn--icon btn--sm" :disabled="current === 0" aria-label="Certificado anterior" @click="current--">
              <ChevronLeft :size="18" aria-hidden="true" />
            </button>
            <span class="small">{{ current + 1 }} de {{ students.length }}</span>
            <button type="button" class="btn btn--ghost btn--icon btn--sm" :disabled="current >= students.length - 1" aria-label="Próximo certificado" @click="current++">
              <ChevronRight :size="18" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div class="preview">
          <CertificatePreview
            :template="template"
            :values="previewValues"
            :signature-image-id="batch.signatureId"
            :label="`Prévia do certificado de ${previewValues.name}`"
          />
        </div>
      </section>
    </div>

    <div class="step__footer">
      <button type="button" class="btn btn--secondary" @click="emit('back')">Voltar</button>
      <button type="button" class="btn btn--primary" :disabled="students.length === 0" @click="emit('finish')">Concluir</button>
    </div>
  </div>
</template>

<style scoped>
.step {
  display: flex;
  flex-direction: column;
  gap: var(--esp-6);
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
  gap: var(--esp-5);
  align-items: start;
}

.layout__main {
  display: flex;
  flex-direction: column;
  gap: var(--esp-5);
}

.layout__preview {
  position: sticky;
  top: calc(60px + var(--esp-4));
}

.block {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  padding: var(--esp-5);
}

.total {
  font-size: var(--texto-lg);
}

.counts {
  margin: 0;
  padding: 0;
  list-style: none;
}

.counts li {
  display: flex;
  justify-content: space-between;
  gap: var(--esp-3);
  padding: var(--esp-2) 0;
  border-top: 1px solid var(--cor-borda);
}

.table-wrap {
  max-height: 480px;
  overflow-y: auto;
}

.table th {
  position: sticky;
  top: 0;
  background: var(--cor-fundo);
}

.row:hover {
  background: var(--cor-fundo-alt);
}

.row--active,
.row--active:hover {
  background: var(--cor-primaria-suave);
}

.row__button {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.row__button:hover {
  color: var(--cor-primaria);
  text-decoration: underline;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-3);
  margin-bottom: var(--esp-3);
}

.pager {
  display: flex;
  align-items: center;
  gap: var(--esp-1);
  font-variant-numeric: tabular-nums;
}

.preview {
  padding: var(--esp-3);
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio-lg);
  background: var(--cor-fundo);
}

.step__footer {
  display: flex;
  justify-content: space-between;
  gap: var(--esp-2);
  padding-top: var(--esp-4);
  border-top: 1px solid var(--cor-borda);
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .layout__preview {
    position: static;
    order: -1;
  }
}
</style>
