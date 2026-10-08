<script setup lang="ts">
import { computed, ref } from 'vue'
import { CircleAlert } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import type { CertificateTemplate, FieldType } from '@/types'
import { formatDate } from '@/lib/dates'
import { useLotStore } from '@/stores/lot'
import { useFilesStore } from '@/stores/files'
import { useGraduationSystemsStore } from '@/stores/graduationSystems'
import { useUiStore } from '@/stores/ui'
import SignatureUpload from '@/components/certificate/SignatureUpload.vue'

const props = defineProps<{ template: CertificateTemplate }>()
const emit = defineEmits<{ next: [] }>()

const lot = useLotStore()
const files = useFilesStore()
const systems = useGraduationSystemsStore()
const ui = useUiStore()
const draft = computed(() => lot.draft!)
const error = ref('')
const replacing = ref(false)

const has = (type: FieldType) => props.template.fields.some((field) => field.type === type)
const templateSignatureUrl = computed(() => files.urlFor(props.template.defaults.signatureImageId))
const newSignatureUrl = computed(() => files.urlFor(draft.value.newSignatureId))
async function onSystemChange(event: Event) {
  const select = event.target as HTMLSelectElement
  const systemId = select.value
  if (draft.value.groups.length > 0) {
    const ok = await ui.confirm({
      title: 'Trocar sistema de graduação',
      message: 'Os alunos já adicionados usam as graduações do sistema atual e serão removidos do lote.',
      confirmLabel: 'Trocar e remover alunos',
      danger: true,
    })
    if (!ok) {
      select.value = lot.system?.id ?? ''
      return
    }
  }
  lot.setSystem(systemId)
}

const templateDateLabel = computed(() => formatDate(props.template.defaults.date) || 'sem data definida')

async function onSignature(blob: Blob) {
  await lot.setNewSignature(blob)
  replacing.value = false
}

function onUseTemplateSignature(event: Event) {
  draft.value.useTemplateSignature = (event.target as HTMLInputElement).checked
}

function next() {
  error.value = ''
  if (draft.value.dateMode === 'custom' && !draft.value.customDate) {
    error.value = 'Informe a nova data ou use a data do modelo.'
    return
  }
  if (draft.value.dateMode === 'template' && has('date') && !props.template.defaults.date) {
    error.value = 'O modelo não tem data definida. Escolha "Definir nova data".'
    return
  }
  emit('next')
}
</script>

<template>
  <form class="step" novalidate @submit.prevent="next">
    <div>
      <h2 class="section-title">Dados do evento</h2>
      <p class="muted">Preencha uma vez. Estes dados valem para todos os certificados deste lote.</p>
    </div>

    <div class="form-field">
      <label class="form-label" for="lot-system">Sistema de graduação</label>
      <select id="lot-system" class="select" :value="lot.system?.id" @change="onSystemChange">
        <option v-for="item in systems.sorted" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
      <RouterLink to="/graduacoes" class="form-help">Criar ou editar sistemas de graduação</RouterLink>
    </div>

    <fieldset class="group">
      <legend class="form-label">Data</legend>
      <label class="choice">
        <input v-model="draft.dateMode" type="radio" value="template" name="date-mode" />
        Usar data do modelo ({{ templateDateLabel }})
      </label>
      <label class="choice">
        <input v-model="draft.dateMode" type="radio" value="custom" name="date-mode" />
        Definir nova data
      </label>
      <div v-if="draft.dateMode === 'custom'" class="form-field indent">
        <label class="visually-hidden" for="lot-date">Nova data</label>
        <input id="lot-date" v-model="draft.customDate" class="input date-input" type="date" />
      </div>
      <p v-if="!has('date')" class="form-help">Este modelo não tem campo de data, então a data não aparece no certificado.</p>
    </fieldset>

    <div class="form-field">
      <label class="form-label" for="lot-location">Local</label>
      <input id="lot-location" v-model="draft.location" class="input" type="text" placeholder="Araçás - BA" />
      <p v-if="!has('location')" class="form-help">Este modelo não tem campo de local, então o local não aparece no certificado.</p>
    </div>

    <fieldset class="group">
      <legend class="form-label">Assinatura</legend>
      <div class="form-field">
        <label class="form-label form-label--light" for="lot-signer">Nome de quem assina</label>
        <input id="lot-signer" v-model="draft.signerName" class="input" type="text" placeholder="Mestre Fulano" />
      </div>

      <template v-if="has('signature')">
        <label v-if="template.defaults.signatureImageId" class="choice">
          <input type="checkbox" :checked="draft.useTemplateSignature" @change="onUseTemplateSignature" />
          Usar assinatura existente no modelo
        </label>

        <div v-if="draft.useTemplateSignature && templateSignatureUrl" class="signature checkerboard">
          <img :src="templateSignatureUrl" alt="Assinatura do modelo" />
        </div>

        <template v-else-if="!draft.useTemplateSignature">
          <template v-if="newSignatureUrl && !replacing">
            <div class="signature checkerboard">
              <img :src="newSignatureUrl" alt="Nova assinatura" />
            </div>
            <div class="inline-actions">
              <button type="button" class="btn btn--secondary btn--sm" @click="replacing = true">Trocar assinatura</button>
              <button type="button" class="btn btn--ghost btn--sm danger" @click="lot.discardNewSignature()">Remover</button>
            </div>
          </template>
          <SignatureUpload v-else :cancellable="Boolean(newSignatureUrl)" @confirm="onSignature" @cancel="replacing = false" />
          <p v-if="!newSignatureUrl" class="form-help">Sem imagem, o certificado sai só com o nome de quem assina.</p>
        </template>
      </template>
    </fieldset>

    <p v-if="error" class="form-error" role="alert">
      <CircleAlert :size="16" aria-hidden="true" />
      {{ error }}
    </p>

    <div class="step__footer">
      <button type="submit" class="btn btn--primary">Continuar para alunos</button>
    </div>
  </form>
</template>

<style scoped>
.step {
  display: flex;
  flex-direction: column;
  gap: var(--esp-6);
  max-width: var(--largura-form);
}

.step p.muted {
  margin-top: var(--esp-1);
}

.group {
  display: flex;
  flex-direction: column;
  gap: var(--esp-2);
  margin: 0;
  padding: 0;
  border: 0;
}

.group legend {
  margin-bottom: var(--esp-2);
  padding: 0;
}

.form-label--light {
  font-weight: var(--peso-normal);
  color: var(--cor-texto-secundario);
}

.indent {
  padding-left: 26px;
}

.date-input {
  max-width: 220px;
}

.signature {
  display: flex;
  justify-content: center;
  padding: var(--esp-3);
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio);
}

.signature img {
  max-height: 96px;
  object-fit: contain;
}

.inline-actions {
  display: flex;
  gap: var(--esp-2);
}

.danger {
  color: var(--cor-erro);
}

.step__footer {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--esp-4);
  border-top: 1px solid var(--cor-borda);
}
</style>
