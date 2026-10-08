<script setup lang="ts">
import { computed, ref } from 'vue'
import { Download } from 'lucide-vue-next'
import { BackupError, packBackup, unpackBackup } from '@/lib/backup'
import { readAllData, replaceAllData } from '@/lib/db'
import { downloadBlob } from '@/lib/download'
import { todayIso } from '@/lib/dates'
import { useTemplatesStore } from '@/stores/templates'
import { useGraduationSystemsStore } from '@/stores/graduationSystems'
import { useLotsStore } from '@/stores/lots'
import { useLotStore } from '@/stores/lot'
import { errorMessage, useUiStore } from '@/stores/ui'
import FileDrop from '@/components/ui/FileDrop.vue'

const templates = useTemplatesStore()
const systems = useGraduationSystemsStore()
const lots = useLotsStore()
const lot = useLotStore()
const ui = useUiStore()

const exporting = ref(false)
const importing = ref(false)
const importError = ref('')

const count = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`)
const currentSummary = computed(() =>
  [
    count(templates.items.length, 'modelo', 'modelos'),
    count(systems.items.length, 'sistema de graduação', 'sistemas de graduação'),
    count(lots.items.length, 'lote gerado', 'lotes gerados'),
  ].join(', '),
)

async function exportBackup() {
  exporting.value = true
  try {
    const bytes = await packBackup(await readAllData())
    downloadBlob(new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/zip' }), `certassign-backup-${todayIso()}.zip`)
    ui.notify('Backup baixado. Guarde o arquivo em um lugar seguro.')
  } catch (error) {
    console.error(error)
    ui.notify(errorMessage(error, 'Não foi possível criar o backup.'), 'error')
  } finally {
    exporting.value = false
  }
}

async function importBackup(file: File) {
  importError.value = ''
  importing.value = true
  try {
    const { data, exportedAt, missing } = await unpackBackup(await file.arrayBuffer())
    const when = new Date(exportedAt).toLocaleDateString('pt-BR')
    const summary = [
      count(data.templates.length, 'modelo', 'modelos'),
      count(data.graduationSystems.length, 'sistema de graduação', 'sistemas de graduação'),
      count(data.lots.length, 'lote gerado', 'lotes gerados'),
      count(data.fonts.length, 'fonte', 'fontes'),
    ].join(', ')
    const ok = await ui.confirm({
      title: 'Restaurar backup',
      message:
        `Backup de ${when}, com ${summary}. Tudo o que está salvo neste navegador agora será apagado e trocado por ele.` +
        (missing ? ` Atenção: ${count(missing, 'arquivo está faltando', 'arquivos estão faltando')} no backup.` : ''),
      confirmLabel: 'Apagar e restaurar',
      danger: true,
    })
    if (!ok) return
    await replaceAllData(data)
    // O rascunho do lote aponta para modelos e arquivos que não existem mais.
    lot.draft = null
    ui.notify('Backup restaurado.')
    // Recarrega para todas as telas lerem os dados restaurados.
    setTimeout(() => window.location.assign('/modelos'), 600)
  } catch (error) {
    if (!(error instanceof BackupError)) console.error(error)
    importError.value =
      error instanceof BackupError ? error.message : errorMessage(error, 'Não foi possível restaurar o backup.')
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="page page--narrow">
    <header class="header">
      <h1 class="page-title">Backup</h1>
      <p class="muted">
        Tudo fica salvo só neste navegador. Se o histórico do navegador for apagado ou você trocar de computador,
        os dados se perdem. Faça um backup de vez em quando.
      </p>
    </header>

    <section class="surface block" aria-labelledby="export-title">
      <h2 id="export-title" class="section-title">Fazer backup</h2>
      <p class="muted">
        Baixa um arquivo .zip com modelos, imagens, assinaturas, fontes enviadas, sistemas de graduação e lotes gerados.
      </p>
      <p class="small">Agora: {{ currentSummary }}.</p>
      <div>
        <button type="button" class="btn btn--primary" :disabled="exporting || importing" @click="exportBackup">
          <Download :size="18" aria-hidden="true" />
          {{ exporting ? 'Preparando backup…' : 'Baixar backup' }}
        </button>
      </div>
    </section>

    <section class="surface block" aria-labelledby="import-title">
      <h2 id="import-title" class="section-title">Restaurar backup</h2>
      <p class="muted">
        Use em outro computador ou depois de limpar o navegador. Os dados atuais deste navegador são trocados pelos do backup.
      </p>
      <FileDrop
        accept=".zip,application/zip"
        :label="importing ? 'Lendo backup…' : 'Escolha ou arraste o arquivo de backup'"
        help="O arquivo .zip baixado em Fazer backup."
        :disabled="importing || exporting"
        @select="importBackup"
      />
      <p v-if="importError" class="form-error" role="alert">{{ importError }}</p>
    </section>
  </div>
</template>

<style scoped>
.header {
  margin-bottom: var(--esp-6);
}

.header p {
  margin-top: var(--esp-1);
}

.block {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  margin-bottom: var(--esp-4);
  padding: var(--esp-5);
}
</style>
