<script setup lang="ts">
import { computed } from 'vue'
import type { Student } from '@/types'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useLotStore } from '@/stores/lot'

const props = defineProps<{
  open: boolean
  students: Student[]
  /** Durante a geração: quantos certificados já foram feitos. null = ainda não começou. */
  progress: number | null
}>()
const emit = defineEmits<{ cancel: []; confirm: [] }>()
const lot = useLotStore()

const generating = computed(() => props.progress !== null)
const totalLabel = computed(() => (props.students.length === 1 ? '1 certificado' : `${props.students.length} certificados`))
const percent = computed(() =>
  props.students.length ? Math.round(((props.progress ?? 0) / props.students.length) * 100) : 0,
)
</script>

<template>
  <BaseModal
    :open="open"
    :title="generating ? 'Gerando certificados' : 'Confirmar certificados'"
    :description="generating ? 'Mantenha esta página aberta até terminar.' : 'Confira os nomes e graduações antes de gerar os certificados.'"
    size="lg"
    :locked="generating"
    @close="emit('cancel')"
  >
    <div v-if="generating" class="progress-block">
      <div
        class="progress"
        role="progressbar"
        :aria-valuenow="progress ?? 0"
        aria-valuemin="0"
        :aria-valuemax="students.length"
        :aria-label="`${progress} de ${students.length} certificados gerados`"
      >
        <div class="progress__bar" :style="{ width: `${percent}%` }" />
      </div>
      <p class="muted" aria-live="polite">{{ progress }} de {{ students.length }} certificados gerados</p>
    </div>

    <template v-else>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Graduação</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(student, index) in students" :key="index">
              <td>{{ student.name }}</td>
              <td>{{ lot.labelOf(student.graduation) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="total">Total: {{ totalLabel }}</p>
    </template>

    <template v-if="!generating" #footer>
      <button type="button" class="btn btn--secondary" @click="emit('cancel')">Cancelar</button>
      <button type="button" class="btn btn--primary" autofocus @click="emit('confirm')">Gerar certificados</button>
    </template>
  </BaseModal>
</template>

<style scoped>
.table-wrap {
  max-height: 50vh;
  overflow-y: auto;
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio);
}

.table th {
  position: sticky;
  top: 0;
  background: var(--cor-fundo);
}

.total {
  margin-top: var(--esp-4);
  font-weight: var(--peso-forte);
}

.progress-block {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  padding: var(--esp-4) 0;
}

.progress {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--cor-fundo-alt);
  box-shadow: inset 0 0 0 1px var(--cor-borda);
}

.progress__bar {
  height: 100%;
  background: var(--cor-primaria);
  transition: width var(--transicao);
}
</style>
