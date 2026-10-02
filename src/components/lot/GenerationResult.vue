<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { CircleCheck, Download } from 'lucide-vue-next'
import type { GeneratedCertificate } from '@/types'
import { buildZip, downloadBlob, pdfBlob } from '@/lib/download'
import { sanitizeFileName } from '@/lib/filename'
import { errorMessage, useUiStore } from '@/stores/ui'

const props = defineProps<{
  certificates: GeneratedCertificate[]
  templateName: string
  /** Gera o PDF único sob demanda. */
  buildCombined: () => Promise<Uint8Array>
}>()
const emit = defineEmits<{ newLot: [] }>()

const ui = useUiStore()
const zipping = ref(false)
const combining = ref(false)

const title = computed(() =>
  props.certificates.length === 1 ? '1 certificado gerado' : `${props.certificates.length} certificados gerados`,
)

async function downloadZip() {
  zipping.value = true
  try {
    downloadBlob(await buildZip(props.certificates), 'certificados.zip')
  } catch (error) {
    ui.notify(errorMessage(error, 'Não foi possível criar o arquivo .zip.'), 'error')
  } finally {
    zipping.value = false
  }
}

async function downloadCombined() {
  combining.value = true
  try {
    const bytes = await props.buildCombined()
    downloadBlob(pdfBlob(bytes), `${sanitizeFileName(props.templateName, 'certificados')}_todos.pdf`)
  } catch (error) {
    ui.notify(errorMessage(error, 'Não foi possível gerar o PDF único.'), 'error')
  } finally {
    combining.value = false
  }
}

function downloadOne(certificate: GeneratedCertificate) {
  downloadBlob(pdfBlob(certificate.bytes), certificate.fileName)
}
</script>

<template>
  <div class="result">
    <header class="result__header">
      <CircleCheck :size="28" class="result__icon" aria-hidden="true" />
      <div>
        <h2 class="page-title result__title">{{ title }}</h2>
        <p class="muted">Baixe todos de uma vez ou cada um separadamente.</p>
      </div>
    </header>

    <div class="result__actions">
      <button type="button" class="btn btn--primary" :disabled="zipping" @click="downloadZip">
        <Download :size="18" aria-hidden="true" />
        {{ zipping ? 'Preparando .zip…' : 'Baixar certificados (.zip)' }}
      </button>
      <button type="button" class="btn btn--secondary" :disabled="combining" @click="downloadCombined">
        {{ combining ? 'Gerando PDF único…' : 'Baixar PDF único para imprimir' }}
      </button>
    </div>

    <section class="surface files" aria-labelledby="files-title">
      <h3 id="files-title" class="files__title">Arquivos</h3>
      <ul class="files__list">
        <li v-for="certificate in certificates" :key="certificate.fileName" class="file">
          <div class="file__info">
            <span class="file__name">{{ certificate.student.name }}</span>
            <span class="muted small">{{ certificate.student.graduation }}, {{ certificate.fileName }}</span>
          </div>
          <button type="button" class="btn btn--ghost btn--sm" :aria-label="`Baixar certificado de ${certificate.student.name}`" @click="downloadOne(certificate)">
            Baixar
          </button>
        </li>
      </ul>
    </section>

    <div class="result__footer">
      <RouterLink to="/modelos" class="btn btn--secondary">Voltar para meus modelos</RouterLink>
      <button type="button" class="btn btn--link" @click="emit('newLot')">Gerar outro lote com este modelo</button>
    </div>
  </div>
</template>

<style scoped>
.result {
  display: flex;
  flex-direction: column;
  gap: var(--esp-6);
  max-width: var(--largura-texto);
}

.result__header {
  display: flex;
  align-items: flex-start;
  gap: var(--esp-3);
}

.result__icon {
  flex-shrink: 0;
  margin-top: 4px;
  color: var(--cor-sucesso);
}

.result__title {
  font-size: var(--texto-xl);
}

.result__header p {
  margin-top: var(--esp-1);
}

.result__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-2);
}

.files {
  padding: var(--esp-4) var(--esp-5);
}

.files__title {
  margin-bottom: var(--esp-2);
  font-size: var(--texto-md);
}

.files__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.file {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-3);
  padding: var(--esp-2) 0;
  border-top: 1px solid var(--cor-borda);
}

.file__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.file__name {
  overflow-wrap: anywhere;
}

.result__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-4);
}
</style>
