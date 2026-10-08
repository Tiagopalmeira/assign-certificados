<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CircleAlert } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { parseNames } from '@/lib/names'
import { previousLevelOf } from '@/lib/graduationSystems'
import { useLotStore } from '@/stores/lot'

/** Formulário de um grupo: escolhe a graduação e cola os nomes dos alunos. */
const props = withDefaults(
  defineProps<{
    initialGraduation?: string
    initialNames?: string[]
    /** Graduação anterior do grupo. Ausente: a que vem antes no sistema. */
    initialPrevious?: string
    /** Mostra a escolha da graduação anterior (quando o modelo usa). */
    showPrevious?: boolean
    /** Graduações que já têm grupo (a primeira livre vem selecionada). */
    usedGraduations?: string[]
    /** Grupo sendo editado, para não avisar que ele vai juntar com ele mesmo. */
    groupId?: string
    editing?: boolean
    cancellable?: boolean
  }>(),
  {
    initialGraduation: '',
    initialNames: () => [],
    initialPrevious: undefined,
    showPrevious: false,
    usedGraduations: () => [],
    groupId: undefined,
    editing: false,
    cancellable: false,
  },
)

const emit = defineEmits<{ submit: [graduation: string, names: string[], previous: string | undefined]; cancel: [] }>()

/** Valor do select para "a anterior no sistema". */
const AUTO = '__auto__'

const lot = useLotStore()
const levels = computed(() => lot.system?.levels ?? [])
const uid = Math.random().toString(36).slice(2)

const graduation = ref(
  props.initialGraduation ||
    levels.value.find((l) => !props.usedGraduations.includes(l.name))?.name ||
    levels.value[0]?.name ||
    '',
)
const previousChoice = ref(props.initialPrevious ?? AUTO)
const previous = computed(() => (previousChoice.value === AUTO ? undefined : previousChoice.value))
const autoPreviousLabel = computed(() => {
  const name = previousLevelOf(lot.system, graduation.value)
  return name ? `A anterior no sistema (${lot.labelOf(name)})` : 'A anterior no sistema (nenhuma)'
})
const previousOptions = computed(() => levels.value.filter((l) => l.name !== graduation.value))
// A anterior não pode ser a própria graduação.
watch(graduation, (name) => {
  if (previousChoice.value === name) previousChoice.value = AUTO
})
const text = ref(props.initialNames.join('\n'))
const error = ref('')

const names = computed(() => parseNames(text.value))
const countLabel = computed(() => {
  const count = names.value.length
  if (count === 0) return ''
  return count === 1 ? '1 nome encontrado' : `${count} nomes encontrados`
})
const mergeNotice = computed(() =>
  lot.findGroup(graduation.value, previous.value, props.groupId)
    ? `Já existe um grupo ${graduation.value}${props.showPrevious ? ' com essa graduação anterior' : ''}. Os nomes serão adicionados a ele.`
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
  emit('submit', graduation.value, names.value, previous.value)
  if (!props.editing) text.value = ''
}
</script>

<template>
  <p v-if="levels.length === 0" class="notice notice--warning" role="alert">
    O sistema "{{ lot.system?.name ?? 'escolhido' }}" ainda não tem graduações.
    <RouterLink to="/graduacoes">Adicione as graduações</RouterLink> ou escolha outro sistema nos dados do evento.
  </p>
  <form v-else class="group-form surface" novalidate @submit.prevent="submit">
    <div class="form-field graduation">
      <label class="form-label" :for="`graduation-${uid}`">{{ lot.system?.levelLabel ?? 'Graduação' }}</label>
      <select :id="`graduation-${uid}`" v-model="graduation" class="select">
        <option v-for="item in levels" :key="item.id" :value="item.name">{{ lot.labelOf(item.name) }}</option>
      </select>
      <p v-if="mergeNotice && !showPrevious" class="form-help">{{ mergeNotice }}</p>
    </div>

    <div v-if="showPrevious" class="form-field graduation">
      <label class="form-label" :for="`previous-${uid}`">{{ lot.system?.levelLabel ?? 'Graduação' }} anterior</label>
      <select :id="`previous-${uid}`" v-model="previousChoice" class="select">
        <option :value="AUTO">{{ autoPreviousLabel }}</option>
        <option v-for="item in previousOptions" :key="item.id" :value="item.name">{{ lot.labelOf(item.name) }}</option>
        <option value="">Nenhuma</option>
      </select>
      <p class="form-help">Troque quando os alunos deste grupo vieram de outra graduação.</p>
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
