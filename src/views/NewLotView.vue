<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { RouterLink, onBeforeRouteLeave } from 'vue-router'
import type { GeneratedCertificate } from '@/types'
import { generateCertificates, generateCombinedPdf, type GenerationInput } from '@/lib/generator'
import { useTemplatesStore } from '@/stores/templates'
import { useFontsStore } from '@/stores/fonts'
import { useFilesStore } from '@/stores/files'
import { useLotStore } from '@/stores/lot'
import { useGraduationsStore } from '@/stores/graduations'
import { errorMessage, useUiStore } from '@/stores/ui'
import EventDataStep from '@/components/lot/EventDataStep.vue'
import StudentsStep from '@/components/lot/StudentsStep.vue'
import ReviewStep from '@/components/lot/ReviewStep.vue'
import ConfirmModal from '@/components/lot/ConfirmModal.vue'
import GenerationResult from '@/components/lot/GenerationResult.vue'

const props = defineProps<{ id: string }>()

const templates = useTemplatesStore()
const fonts = useFontsStore()
const files = useFilesStore()
const lot = useLotStore()
const graduations = useGraduationsStore()
const ui = useUiStore()

const template = computed(() => templates.byId(props.id))
if (template.value) lot.start(template.value)

type Step = 'event' | 'students' | 'review' | 'done'
const STEPS: { id: Exclude<Step, 'done'>; label: string }[] = [
  { id: 'event', label: 'Dados do evento' },
  { id: 'students', label: 'Alunos' },
  { id: 'review', label: 'Revisão' },
]

// Retomando um rascunho com alunos, começa direto na lista.
const step = ref<Step>(lot.students.length ? 'students' : 'event')
const stepIndex = computed(() => STEPS.findIndex((s) => s.id === step.value))

const confirming = ref(false)
const progress = ref<number | null>(null)
const results = shallowRef<GeneratedCertificate[]>([])
let lastInput: GenerationInput | null = null

function go(target: Step) {
  step.value = target
  window.scrollTo({ top: 0 })
}

function generationInput(): GenerationInput {
  const batch = lot.toBatch(template.value!)
  return {
    template: template.value!,
    date: batch.date,
    location: batch.location,
    signerName: batch.signerName,
    signatureId: batch.signatureId,
    students: batch.students,
    graduationTitles: graduations.titles,
    fonts: fonts.variants,
    loadFile: (id) => files.getBlob(id),
  }
}

async function generate() {
  if (!template.value) return
  const input = generationInput()
  progress.value = 0
  try {
    results.value = await generateCertificates(input, (done) => (progress.value = done))
    lastInput = input
    confirming.value = false
    go('done')
  } catch (error) {
    console.error(error)
    ui.notify(errorMessage(error, 'Não foi possível gerar os certificados. Tente novamente.'), 'error')
  } finally {
    progress.value = null
  }
}

function buildCombined() {
  return generateCombinedPdf(lastInput ?? generationInput())
}

async function newLot() {
  if (!template.value) return
  await lot.reset(template.value)
  results.value = []
  lastInput = null
  go('event')
}

onBeforeRouteLeave(() => {
  if (progress.value !== null) {
    ui.notify('Aguarde a geração terminar antes de sair.', 'info')
    return false
  }
  return true
})
</script>

<template>
  <div v-if="!template" class="page page--narrow">
    <h1 class="page-title">Modelo não encontrado</h1>
    <p class="muted missing">Ele pode ter sido excluído ou estar salvo em outro navegador.</p>
    <RouterLink to="/modelos" class="btn btn--primary">Ver meus modelos</RouterLink>
  </div>

  <div v-else-if="template.fields.length === 0" class="page page--narrow">
    <h1 class="page-title">Novo lote</h1>
    <p class="muted missing">O modelo "{{ template.name }}" ainda não tem campos. Adicione pelo menos o campo Nome antes de gerar certificados.</p>
    <RouterLink :to="`/modelos/${template.id}/editar`" class="btn btn--primary">Editar modelo</RouterLink>
  </div>

  <div v-else class="page">
    <header class="header">
      <RouterLink to="/modelos" class="btn btn--link">Meus modelos</RouterLink>
      <h1 class="page-title">Novo lote</h1>
      <ol v-if="step !== 'done'" class="steps" aria-label="Etapas">
        <li
          v-for="(item, index) in STEPS"
          :key="item.id"
          class="steps__item"
          :class="{ 'steps__item--current': index === stepIndex, 'steps__item--done': index < stepIndex }"
          :aria-current="index === stepIndex ? 'step' : undefined"
        >
          <span class="steps__number" aria-hidden="true">{{ index + 1 }}</span>
          {{ item.label }}
        </li>
      </ol>
    </header>

    <EventDataStep v-if="step === 'event'" :template="template" @next="go('students')" />
    <StudentsStep v-else-if="step === 'students'" :template="template" @back="go('event')" @next="go('review')" />
    <ReviewStep
      v-else-if="step === 'review'"
      :template="template"
      @back="go('students')"
      @edit-event="go('event')"
      @finish="confirming = true"
    />
    <GenerationResult
      v-else
      :certificates="results"
      :template-name="template.name"
      :build-combined="buildCombined"
      @new-lot="newLot"
    />

    <ConfirmModal
      :open="confirming"
      :students="lot.students"
      :progress="progress"
      @cancel="confirming = false"
      @confirm="generate"
    />
  </div>
</template>

<style scoped>
.missing {
  margin: var(--esp-2) 0 var(--esp-5);
}

.header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--esp-2);
  margin-bottom: var(--esp-6);
}

.steps {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-2) var(--esp-6);
  margin: var(--esp-3) 0 0;
  padding: 0;
  list-style: none;
}

.steps__item {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  font-size: var(--texto-sm);
  color: var(--cor-texto-secundario);
}

.steps__number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid var(--cor-borda);
  border-radius: 50%;
  font-size: var(--texto-xs);
  font-weight: var(--peso-medio);
}

.steps__item--current {
  color: var(--cor-texto);
  font-weight: var(--peso-medio);
}

.steps__item--current .steps__number {
  border-color: var(--cor-primaria);
  background: var(--cor-primaria);
  color: var(--cor-texto-inverso);
}

.steps__item--done .steps__number {
  border-color: var(--cor-primaria);
  color: var(--cor-primaria);
}
</style>
