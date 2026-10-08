<script setup lang="ts">
import { ref, watch } from 'vue'
import { CircleAlert } from 'lucide-vue-next'
import BaseModal from '@/components/ui/BaseModal.vue'
import FileDrop from '@/components/ui/FileDrop.vue'
import { ACCEPTED_TEMPLATE_EXTENSIONS, detectTemplateType, importTemplateFile } from '@/lib/templateImport'
import { useTemplatesStore } from '@/stores/templates'
import { errorMessage, useUiStore } from '@/stores/ui'
import type { CertificateTemplate } from '@/types'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; created: [template: CertificateTemplate] }>()

const templates = useTemplatesStore()
const ui = useUiStore()

const name = ref('')
const file = ref<File | null>(null)
const error = ref('')
const busy = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    name.value = ''
    file.value = null
    error.value = ''
  },
)

function onFile(selected: File) {
  error.value = ''
  if (!detectTemplateType(selected)) {
    error.value = 'Formato não aceito. Envie um arquivo PDF, PNG ou JPG.'
    return
  }
  file.value = selected
  if (!name.value.trim()) name.value = selected.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
}

async function submit() {
  error.value = ''
  if (!file.value) {
    error.value = 'Escolha o arquivo do modelo.'
    return
  }
  if (!name.value.trim()) {
    error.value = 'Dê um nome para o modelo.'
    return
  }
  busy.value = true
  try {
    const imported = await importTemplateFile(file.value)
    const template = await templates.create(name.value, imported)
    for (const notice of imported.notices) ui.notify(notice, 'info')
    emit('created', template)
  } catch (e) {
    error.value = errorMessage(e, 'Não foi possível criar o modelo. Tente outro arquivo.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    title="Criar novo modelo"
    description="Envie a arte do certificado. Depois você posiciona os campos sobre ela."
    :locked="busy"
    @close="emit('close')"
  >
    <form id="new-template-form" class="form" novalidate @submit.prevent="submit">
      <FileDrop
        :accept="ACCEPTED_TEMPLATE_EXTENSIONS"
        label="Escolha ou arraste o arquivo"
        help="PDF, PNG ou JPG. No PDF, usamos a primeira página."
        :file-name="file?.name"
        :disabled="busy"
        @select="onFile"
      />
      <div class="form-field">
        <label class="form-label" for="template-name">Nome do modelo</label>
        <input id="template-name" v-model="name" class="input" type="text" placeholder="Certificado de graduação 2026" :disabled="busy" />
      </div>
      <p v-if="error" class="form-error" role="alert">
        <CircleAlert :size="16" aria-hidden="true" />
        {{ error }}
      </p>
    </form>
    <template #footer>
      <button type="button" class="btn btn--secondary" :disabled="busy" @click="emit('close')">Cancelar</button>
      <button type="submit" form="new-template-form" class="btn btn--primary" :disabled="busy">
        {{ busy ? 'Preparando modelo…' : 'Criar modelo' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--esp-5);
}
</style>
