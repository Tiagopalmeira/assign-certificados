<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import type { CertificateTemplate, StudentGroup as Group } from '@/types'
import { useLotStore } from '@/stores/lot'
import { usesPreviousGraduation } from '@/lib/fieldText'
import { useUiStore } from '@/stores/ui'
import EventSummary from './EventSummary.vue'
import StudentGroup from '@/components/students/StudentGroup.vue'
import StudentGroupForm from '@/components/students/StudentGroupForm.vue'

const props = defineProps<{ template: CertificateTemplate }>()
const emit = defineEmits<{ back: []; next: [] }>()

const lot = useLotStore()
const ui = useUiStore()

const groups = computed(() => lot.draft?.groups ?? [])
const usedGraduations = computed(() => groups.value.map((g) => g.graduation))
const adding = ref(groups.value.length === 0)
const editingId = ref<string | null>(null)
const total = computed(() => lot.students.length)
const showPrevious = computed(() => usesPreviousGraduation(props.template))

function onAdd(graduation: string, names: string[], previous?: string) {
  lot.addGroup(graduation, names, previous)
  adding.value = false
}

function onEdit(group: Group, graduation: string, names: string[], previous?: string) {
  lot.updateGroup(group.id, graduation, names, previous)
  editingId.value = null
}

async function removeGroup(group: Group) {
  const ok = await ui.confirm({
    title: 'Remover grupo',
    message: `Os ${group.names.length} nomes da graduação ${group.graduation} serão removidos do lote.`,
    confirmLabel: 'Remover grupo',
    danger: true,
  })
  if (ok) lot.removeGroup(group.id)
  if (groups.value.length === 0) adding.value = true
}

function removeStudent(group: Group, index: number) {
  lot.removeStudent(group.id, index)
  if (groups.value.length === 0) adding.value = true
}
</script>

<template>
  <div class="step">
    <EventSummary :template="template" editable @edit="emit('back')" />

    <section class="students" aria-labelledby="students-title">
      <div class="students__header">
        <h2 id="students-title" class="section-title">Alunos</h2>
        <p v-if="total" class="muted">{{ total === 1 ? '1 certificado' : `${total} certificados` }} no lote</p>
      </div>

      <template v-for="group in groups" :key="group.id">
        <StudentGroupForm
          v-if="editingId === group.id"
          :initial-graduation="group.graduation"
          :initial-names="group.names"
          :initial-previous="group.previousGraduation"
          :show-previous="showPrevious"
          :group-id="group.id"
          editing
          cancellable
          @submit="(graduation, names, previous) => onEdit(group, graduation, names, previous)"
          @cancel="editingId = null"
        />
        <StudentGroup
          v-else
          :group="group"
          :show-previous="showPrevious"
          @edit="editingId = group.id"
          @remove="removeGroup(group)"
          @remove-student="(index) => removeStudent(group, index)"
        />
      </template>

      <StudentGroupForm
        v-if="adding"
        :used-graduations="usedGraduations"
        :show-previous="showPrevious"
        :cancellable="groups.length > 0"
        @submit="onAdd"
        @cancel="adding = false"
      />
      <button v-else type="button" class="btn btn--secondary add" @click="adding = true">
        <Plus :size="18" aria-hidden="true" />
        Adicionar graduação
      </button>
    </section>

    <div class="step__footer">
      <button type="button" class="btn btn--secondary" @click="emit('back')">Voltar</button>
      <button type="button" class="btn btn--primary" :disabled="total === 0" @click="emit('next')">Revisar certificados</button>
    </div>
  </div>
</template>

<style scoped>
.step {
  display: flex;
  flex-direction: column;
  gap: var(--esp-6);
}

.students {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  max-width: var(--largura-texto);
}

.students__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--esp-2);
}

.add {
  align-self: flex-start;
}

.step__footer {
  display: flex;
  justify-content: space-between;
  gap: var(--esp-2);
  max-width: var(--largura-texto);
  padding-top: var(--esp-4);
  border-top: 1px solid var(--cor-borda);
}
</style>
