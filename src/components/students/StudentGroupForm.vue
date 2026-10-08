<script setup lang="ts">
import { computed, ref } from 'vue'
import { CircleAlert } from 'lucide-vue-next'
import { parseNames } from '@/lib/names'
import { useGraduationsStore } from '@/stores/graduations'

/** Formulário de um grupo: escolhe a graduação e cola os nomes dos alunos. */
const props = withDefaults(
  defineProps<{
    initialGraduation?: string
    initialNames?: string[]
    /** Graduações que já têm grupo (a primeira livre vem selecionada). */
    usedGraduations?: string[]
    editing?: boolean
    cancellable?: boolean
  }>(),
  { initialGraduation: '', initialNames: () => [], usedGraduations: () => [], editing: false, cancellable: false },
)

const emit = defineEmits<{ submit: [graduation: string, names: string[]]; cancel: [] }>()

const graduations = useGraduationsStore()
const uid = Math.random().toString(36).slice(2)

const graduation = ref(
  props.initialGraduation ||
    graduations.names.find((g) => !props.usedGraduations.includes(g)) ||
    graduations.names[0] ||
    '',
)
const text = ref(props.initialNames.join('\n'))
const error = ref('')

const names = computed(() => parseNames(text.value))
const countLabel = computed(() => {
  const count = names.value.length
  if (count === 0) return ''
  return count === 1 ? '1 nome encontrado' : `${count} nomes encontrados`
})
const mergeNotice = computed(
  () => !props.editing && props.usedGraduations.includes(graduation.value)
    ? `Já existe um grupo ${graduation.value}. Os nomes serão adicionados a ele.`
    : '',
)

function submit() {
  error.value = ''
  if (!graduation.value) {
    error.value = 'Escolha a graduação.'
    return
  }
  if (names.value.length === 0) {
    error.value = 'Digite pelo menos um nome.'
    return
  }
  emit('submit', graduation.value, names.value)
  if (!props.editing) text.value = ''
}
</script>

<template>
  <form class="group-form surface" novalidate @submit.prevent="submit">
    <div class="form-field graduation">
      <label class="form-label" :for="`graduation-${uid}`">Graduação</label>
      <select :id="`graduation-${uid}`" v-model="graduation" class="select">
        <option v-for="item in graduations.list" :key="item.name" :value="item.name">{{ graduations.labelOf(item.name) }}</option>
      </select>
      <p v-if="mergeNotice" class="form-help">{{ mergeNotice }}</p>
    </div>

    <div class="form-field">
      <label class="form-label" :for="`names-${uid}`">Nomes dos alunos</label>
      <textarea
        :id="`names-${uid}`"
        v-model="text"
        class="textarea"
        rows="6"
        :placeholder="'João da Silva\nMaria Santos\nPedro Souza'"
        :aria-describedby="`names-help-${uid}`"
        :aria-invalid="Boolean(error) && names.length === 0"
      />
      <p :id="`names-help-${uid}`" class="form-help names-help">
        <span>Um nome por linha, ou separados por vírgula ou ponto e vírgula.</span>
        <span v-if="countLabel" class="count">{{ countLabel }}</span>
      </p>
    </div>

    <p v-if="error" class="form-error" role="alert">
      <CircleAlert :size="16" aria-hidden="true" />
      {{ error }}
    </p>

    <div class="actions">
      <button v-if="cancellable" type="button" class="btn btn--secondary" @click="emit('cancel')">Cancelar</button>
      <button type="submit" class="btn btn--primary">{{ editing ? 'Salvar grupo' : 'Adicionar' }}</button>
    </div>
  </form>
</template>

<style scoped>
.group-form {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
  padding: var(--esp-5);
}

.graduation {
  max-width: 320px;
}

.names-help {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--esp-2);
}

.count {
  color: var(--cor-texto);
  font-weight: var(--peso-medio);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--esp-2);
}
</style>
