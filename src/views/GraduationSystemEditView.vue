<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, onBeforeRouteLeave, useRouter } from 'vue-router'
import { ArrowDown, ArrowUp, CircleAlert, Plus, Trash2 } from 'lucide-vue-next'
import type { GraduationSystem } from '@/lib/graduationSystems'
import { colorsIn } from '@/lib/colorRuns'
import { isValidHex } from '@/lib/color'
import { createId } from '@/lib/ids'
import { useGraduationSystemsStore } from '@/stores/graduationSystems'
import { errorMessage, useUiStore } from '@/stores/ui'
import ColorSwatches from '@/components/graduations/ColorSwatches.vue'

const props = defineProps<{ id: string }>()

const systems = useGraduationSystemsStore()
const ui = useUiStore()
const router = useRouter()

const original = systems.byId(props.id)
const system = ref<GraduationSystem | null>(original ? JSON.parse(JSON.stringify(original)) : null)
const saved = ref(JSON.stringify(system.value))
const dirty = computed(() => JSON.stringify(system.value) !== saved.value)
const saving = ref(false)
const errors = ref<string[]>([])
const bulkOpen = ref(false)
const bulkText = ref('')

const LABEL_SUGGESTIONS = ['Faixa', 'Corda', 'Graduação', 'Cinturão', 'Nível']

function addColor() {
  system.value?.colors.push({ word: '', hex: '#1D4FB8' })
}

function removeColor(index: number) {
  system.value?.colors.splice(index, 1)
}

function addLevel() {
  system.value?.levels.push({ id: createId(), name: '', title: '' })
}

function addBulk() {
  if (!system.value) return
  // Uma graduação por linha (vírgulas fazem parte de nomes como "Verde, Amarelo e Azul").
  const names = bulkText.value
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  for (const name of names) system.value.levels.push({ id: createId(), name, title: '' })
  bulkText.value = ''
  bulkOpen.value = false
}

function move(index: number, delta: number) {
  const levels = system.value?.levels
  if (!levels) return
  const target = index + delta
  if (target < 0 || target >= levels.length) return
  const [item] = levels.splice(index, 1)
  levels.splice(target, 0, item)
}

function removeLevel(index: number) {
  system.value?.levels.splice(index, 1)
}

function validate(value: GraduationSystem): string[] {
  const problems: string[] = []
  if (!value.name.trim()) problems.push('Dê um nome para o sistema.')
  if (!value.levelLabel.trim()) problems.push('Informe como a graduação é chamada (ex.: Faixa).')
  const names = value.levels.map((l) => l.name.trim().toLocaleLowerCase('pt-BR')).filter(Boolean)
  const repeated = [...new Set(names.filter((name, i) => names.indexOf(name) !== i))]
  if (repeated.length) problems.push(`Graduações repetidas: ${repeated.join(', ')}. Cada graduação precisa de um nome diferente.`)
  const badColor = value.colors.find((c) => c.word.trim() && !isValidHex(c.hex))
  if (badColor) problems.push(`A cor de "${badColor.word}" não é válida.`)
  return problems
}

async function save() {
  if (!system.value) return false
  const cleaned: GraduationSystem = {
    ...system.value,
    name: system.value.name.trim(),
    levelLabel: system.value.levelLabel.trim(),
    colors: system.value.colors.map((c) => ({ word: c.word.trim(), hex: c.hex })).filter((c) => c.word),
    levels: system.value.levels
      .map((l) => ({ ...l, name: l.name.replace(/\s+/g, ' ').trim(), title: l.title.trim() }))
      .filter((l) => l.name),
  }
  errors.value = validate(cleaned)
  if (errors.value.length) return false
  saving.value = true
  try {
    const result = await systems.save(cleaned)
    system.value = JSON.parse(JSON.stringify(result))
    saved.value = JSON.stringify(system.value)
    ui.notify('Sistema salvo.')
    return true
  } catch (error) {
    ui.notify(errorMessage(error, 'Não foi possível salvar o sistema.'), 'error')
    return false
  } finally {
    saving.value = false
  }
}

async function saveAndBack() {
  if (await save()) router.push('/graduacoes')
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value) event.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

onBeforeRouteLeave(async () => {
  if (!dirty.value) return true
  return ui.confirm({
    title: 'Sair sem salvar?',
    message: 'As alterações feitas neste sistema serão perdidas.',
    confirmLabel: 'Sair sem salvar',
    cancelLabel: 'Continuar editando',
    danger: true,
  })
})
</script>

<template>
  <div v-if="!system" class="page page--narrow">
    <h1 class="page-title">Sistema não encontrado</h1>
    <p class="muted missing">Ele pode ter sido excluído ou estar salvo em outro navegador.</p>
    <RouterLink to="/graduacoes" class="btn btn--primary">Ver graduações</RouterLink>
  </div>

  <form v-else class="page page--narrow editor" novalidate @submit.prevent="saveAndBack">
    <header class="header">
      <RouterLink to="/graduacoes" class="btn btn--link">Graduações</RouterLink>
      <h1 class="page-title">{{ system.name || 'Sistema sem nome' }}</h1>
    </header>

    <section class="section">
      <div class="row">
        <div class="form-field">
          <label class="form-label" for="system-name">Nome do sistema</label>
          <input id="system-name" v-model="system.name" class="input" type="text" placeholder="Judô – Federação Paulista" />
        </div>
        <div class="form-field">
          <label class="form-label" for="system-label">Como a graduação é chamada</label>
          <input id="system-label" v-model="system.levelLabel" class="input" type="text" list="label-suggestions" placeholder="Faixa" />
          <datalist id="label-suggestions">
            <option v-for="item in LABEL_SUGGESTIONS" :key="item" :value="item" />
          </datalist>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="colors-title">
      <div>
        <h2 id="colors-title" class="section-title">Cores</h2>
        <p class="form-help">Quando a palavra aparece no nome da graduação, ela sai com esta cor no certificado.</p>
      </div>
      <ul v-if="system.colors.length" class="colors">
        <li v-for="(color, index) in system.colors" :key="index" class="color">
          <input v-model="color.hex" class="color__swatch" type="color" :aria-label="`Cor de ${color.word || 'nova palavra'}`" />
          <label class="visually-hidden" :for="`color-word-${index}`">Palavra</label>
          <input :id="`color-word-${index}`" v-model="color.word" class="input input--sm" type="text" placeholder="Ex.: Azul" />
          <button type="button" class="btn btn--ghost btn--icon btn--sm danger" :aria-label="`Remover ${color.word || 'cor'}`" @click="removeColor(index)">
            <Trash2 :size="16" aria-hidden="true" />
          </button>
        </li>
      </ul>
      <button type="button" class="btn btn--secondary btn--sm add" @click="addColor">
        <Plus :size="16" aria-hidden="true" />
        Adicionar cor
      </button>
    </section>

    <section class="section" aria-labelledby="levels-title">
      <div>
        <h2 id="levels-title" class="section-title">Graduações</h2>
        <p class="form-help">Da primeira à última. O título é opcional (ex.: Professor, Mestre).</p>
      </div>
      <ol v-if="system.levels.length" class="levels">
        <li v-for="(level, index) in system.levels" :key="level.id" class="level">
          <span class="level__number" aria-hidden="true">{{ index + 1 }}</span>
          <div class="level__fields">
            <div class="level__name">
              <ColorSwatches :colors="colorsIn(level.name, system.colors)" />
              <label class="visually-hidden" :for="`level-name-${level.id}`">Graduação {{ index + 1 }}</label>
              <input :id="`level-name-${level.id}`" v-model="level.name" class="input input--sm" type="text" placeholder="Nome da graduação" />
            </div>
            <label class="visually-hidden" :for="`level-title-${level.id}`">Título da graduação {{ index + 1 }} (opcional)</label>
            <input :id="`level-title-${level.id}`" v-model="level.title" class="input input--sm" type="text" placeholder="Título (opcional)" />
          </div>
          <div class="level__actions">
            <button type="button" class="btn btn--ghost btn--icon btn--sm" :disabled="index === 0" :aria-label="`Subir ${level.name || 'graduação'}`" @click="move(index, -1)">
              <ArrowUp :size="16" aria-hidden="true" />
            </button>
            <button type="button" class="btn btn--ghost btn--icon btn--sm" :disabled="index === system.levels.length - 1" :aria-label="`Descer ${level.name || 'graduação'}`" @click="move(index, 1)">
              <ArrowDown :size="16" aria-hidden="true" />
            </button>
            <button type="button" class="btn btn--ghost btn--icon btn--sm danger" :aria-label="`Remover ${level.name || 'graduação'}`" @click="removeLevel(index)">
              <Trash2 :size="16" aria-hidden="true" />
            </button>
          </div>
        </li>
      </ol>
      <p v-else class="muted">Nenhuma graduação ainda.</p>

      <div v-if="bulkOpen" class="bulk surface">
        <div class="form-field">
          <label class="form-label" for="bulk-levels">Várias graduações de uma vez</label>
          <textarea id="bulk-levels" v-model="bulkText" class="textarea" rows="6" :placeholder="'Branca\nAzul\nRoxa'" />
          <span class="form-help">Uma graduação por linha. Elas entram no fim da lista.</span>
        </div>
        <div class="bulk__actions">
          <button type="button" class="btn btn--secondary btn--sm" @click="bulkOpen = false">Cancelar</button>
          <button type="button" class="btn btn--primary btn--sm" :disabled="!bulkText.trim()" @click="addBulk">Adicionar à lista</button>
        </div>
      </div>
      <div v-else class="add-row">
        <button type="button" class="btn btn--secondary btn--sm" @click="addLevel">
          <Plus :size="16" aria-hidden="true" />
          Adicionar graduação
        </button>
        <button type="button" class="btn btn--ghost btn--sm" @click="bulkOpen = true">Adicionar várias</button>
      </div>
    </section>

    <div v-if="errors.length" class="form-error errors" role="alert">
      <CircleAlert :size="16" aria-hidden="true" />
      <ul>
        <li v-for="error in errors" :key="error">{{ error }}</li>
      </ul>
    </div>

    <div class="footer">
      <RouterLink to="/graduacoes" class="btn btn--secondary">Voltar</RouterLink>
      <button type="submit" class="btn btn--primary" :disabled="saving || !dirty">
        {{ saving ? 'Salvando…' : 'Salvar alterações' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.missing {
  margin: var(--esp-2) 0 var(--esp-5);
}

.editor {
  display: flex;
  flex-direction: column;
  gap: var(--esp-8);
}

.header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--esp-2);
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
}

.section .form-help {
  margin-top: var(--esp-1);
}

.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--esp-4);
}

.colors {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--esp-2) var(--esp-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.color {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
}

.color__swatch {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio-sm);
  background: var(--cor-fundo);
  cursor: pointer;
}

.add {
  align-self: flex-start;
}

.levels {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.level {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  padding: var(--esp-2) 0;
  border-bottom: 1px solid var(--cor-borda);
}

.level__number {
  width: 24px;
  flex-shrink: 0;
  font-size: var(--texto-sm);
  color: var(--cor-texto-secundario);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.level__fields {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: var(--esp-2);
  min-width: 0;
}

.level__name {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  min-width: 0;
}

.level__actions {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
}

.danger {
  color: var(--cor-erro);
}

.add-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-2);
}

.bulk {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  padding: var(--esp-4);
}

.bulk__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--esp-2);
}

.errors {
  align-items: flex-start;
}

.errors ul {
  margin: 0;
  padding-left: var(--esp-4);
}

.footer {
  display: flex;
  justify-content: space-between;
  gap: var(--esp-2);
  padding-top: var(--esp-4);
  border-top: 1px solid var(--cor-borda);
}

@media (max-width: 560px) {
  .level {
    align-items: flex-start;
  }

  .level__fields {
    grid-template-columns: minmax(0, 1fr);
  }

  .level__actions {
    flex-direction: column;
  }
}
</style>
