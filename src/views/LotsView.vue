<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, onBeforeRouteLeave, useRouter } from 'vue-router'
import { Download } from 'lucide-vue-next'
import type { LotRecord } from '@/types'
import { formatDate } from '@/lib/dates'
import { generateCertificates } from '@/lib/generator'
import { buildZip, downloadBlob } from '@/lib/download'
import { sanitizeFileName } from '@/lib/filename'
import { studentsOf } from '@/lib/values'
import { useLotsStore } from '@/stores/lots'
import { useLotStore } from '@/stores/lot'
import { useTemplatesStore } from '@/stores/templates'
import { useGraduationSystemsStore } from '@/stores/graduationSystems'
import { useFontsStore } from '@/stores/fonts'
import { useFilesStore } from '@/stores/files'
import { errorMessage, useUiStore } from '@/stores/ui'

const history = useLotsStore()
const lot = useLotStore()
const templates = useTemplatesStore()
const systems = useGraduationSystemsStore()
const fonts = useFontsStore()
const files = useFilesStore()
const ui = useUiStore()
const router = useRouter()

/** Lote sendo gerado de novo e quantos certificados já ficaram prontos. */
const busyId = ref<string | null>(null)
const progress = ref(0)

const plural = (count: number) => (count === 1 ? '1 certificado' : `${count} certificados`)

function generatedAt(iso: string) {
  const date = new Date(iso)
  return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function groupsLabel(record: LotRecord) {
  return record.groups.map((group) => `${group.graduation} (${group.names.length})`).join(', ')
}

async function downloadAgain(record: LotRecord) {
  const template = templates.byId(record.templateId)
  if (!template) return
  busyId.value = record.id
  progress.value = 0
  try {
    const certificates = await generateCertificates(
      {
        template,
        date: record.date,
        location: record.location,
        signerName: record.signerName,
        signatureId: record.signatureId,
        students: studentsOf(record.groups),
        graduationSystem: systems.resolve(record.systemId),
        fonts: fonts.variants,
        loadFile: (id) => files.getBlob(id),
      },
      (done) => (progress.value = done),
    )
    const name = sanitizeFileName(`${record.templateName} ${record.date}`, 'certificados')
    downloadBlob(await buildZip(certificates), `${name}.zip`)
  } catch (error) {
    console.error(error)
    ui.notify(errorMessage(error, 'Não foi possível gerar os certificados de novo.'), 'error')
  } finally {
    busyId.value = null
  }
}

async function openToFix(record: LotRecord) {
  const template = templates.byId(record.templateId)
  if (!template) return
  if (lot.draft?.groups.length) {
    const ok = await ui.confirm({
      title: 'Abrir lote',
      message: 'Já existe um lote em montagem. Ele será substituído por este.',
      confirmLabel: 'Abrir lote',
    })
    if (!ok) return
  }
  await lot.openRecord(template, record)
  router.push(`/modelos/${template.id}/lote`)
}

async function remove(record: LotRecord) {
  const ok = await ui.confirm({
    title: 'Excluir lote do histórico',
    message: `O lote de ${plural(record.count)} de "${record.templateName}" sai do histórico. Os arquivos já baixados não são afetados.`,
    confirmLabel: 'Excluir lote',
    danger: true,
  })
  if (!ok) return
  await history.remove(record.id)
  ui.notify('Lote excluído do histórico.')
}

onBeforeRouteLeave(() => {
  if (busyId.value === null) return true
  ui.notify('Aguarde a geração terminar antes de sair.', 'info')
  return false
})
</script>

<template>
  <div class="page">
    <header class="header">
      <h1 class="page-title">Lotes gerados</h1>
      <p class="muted">Baixe de novo ou abra um lote para corrigir um nome e gerar outra vez.</p>
    </header>

    <section v-if="history.items.length === 0" class="empty surface">
      <h2 class="section-title">Nenhum lote gerado ainda</h2>
      <p class="muted">Os lotes aparecem aqui depois de gerados, para baixar de novo quando precisar.</p>
      <RouterLink to="/modelos" class="btn btn--primary">Ver meus modelos</RouterLink>
    </section>

    <ul v-else class="list">
      <li v-for="record in history.sorted" :key="record.id" class="item surface">
        <div class="item__main">
          <h2 class="item__title">{{ record.templateName }}</h2>
          <p class="small">
            {{ plural(record.count) }}<template v-if="record.date">, {{ formatDate(record.date, 'long') }}</template><template v-if="record.location">, {{ record.location }}</template>
          </p>
          <p class="muted small">{{ groupsLabel(record) }}</p>
          <p class="muted small">Gerado em {{ generatedAt(record.createdAt) }}</p>
          <p v-if="!templates.byId(record.templateId)" class="notice notice--warning small">
            O modelo deste lote foi excluído. Não dá para gerar de novo.
          </p>
        </div>
        <div v-if="templates.byId(record.templateId)" class="item__actions">
          <button type="button" class="btn btn--secondary btn--sm" :disabled="busyId !== null" @click="downloadAgain(record)">
            <Download :size="16" aria-hidden="true" />
            {{ busyId === record.id ? `Gerando ${progress} de ${record.count}…` : 'Baixar .zip' }}
          </button>
          <button type="button" class="btn btn--ghost btn--sm" :disabled="busyId !== null" @click="openToFix(record)">
            Abrir para corrigir
          </button>
          <button type="button" class="btn btn--ghost btn--sm danger" :disabled="busyId !== null" @click="remove(record)">
            Excluir
          </button>
        </div>
        <div v-else class="item__actions">
          <button type="button" class="btn btn--ghost btn--sm danger" @click="remove(record)">Excluir</button>
        </div>
      </li>
    </ul>
    <p v-if="history.items.length" class="muted small footnote">
      Os certificados são gerados de novo com o modelo como ele está hoje. Se o modelo foi alterado, eles saem com as
      alterações.
    </p>
  </div>
</template>

<style scoped>
.header {
  margin-bottom: var(--esp-6);
}

.header p {
  margin-top: var(--esp-1);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--esp-4);
  padding: var(--esp-4) var(--esp-5);
}

.item__main {
  display: flex;
  flex-direction: column;
  gap: var(--esp-1);
  min-width: 0;
}

.item__title {
  font-size: var(--texto-lg);
}

.item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-1);
}

.danger {
  color: var(--cor-erro);
}

.footnote {
  margin-top: var(--esp-4);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--esp-3);
  max-width: var(--largura-texto);
  margin: var(--esp-8) auto 0;
  padding: var(--esp-8) var(--esp-5);
  text-align: center;
}
</style>
