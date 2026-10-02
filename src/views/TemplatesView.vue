<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import TemplateCard from '@/components/templates/TemplateCard.vue'
import NewTemplateDialog from '@/components/templates/NewTemplateDialog.vue'
import { useTemplatesStore } from '@/stores/templates'
import { useUiStore } from '@/stores/ui'
import type { CertificateTemplate } from '@/types'

const templates = useTemplatesStore()
const ui = useUiStore()
const router = useRouter()
const creating = ref(false)

function onCreated(template: CertificateTemplate) {
  creating.value = false
  router.push(`/modelos/${template.id}/editar`)
}

async function duplicate(template: CertificateTemplate) {
  const copy = await templates.duplicate(template.id)
  if (copy) ui.notify(`Modelo duplicado como "${copy.name}".`)
}

async function remove(template: CertificateTemplate) {
  const ok = await ui.confirm({
    title: 'Excluir modelo',
    message: `O modelo "${template.name}" e as imagens dele serão apagados deste navegador. Essa ação não pode ser desfeita.`,
    confirmLabel: 'Excluir modelo',
    danger: true,
  })
  if (!ok) return
  await templates.remove(template.id)
  ui.notify('Modelo excluído.')
}
</script>

<template>
  <div class="page">
    <header class="header">
      <div>
        <h1 class="page-title">Meus modelos</h1>
        <p class="muted">Escolha um modelo para gerar certificados ou crie um novo.</p>
      </div>
      <button v-if="templates.items.length" type="button" class="btn btn--primary" @click="creating = true">
        <Plus :size="18" aria-hidden="true" />
        Criar novo modelo
      </button>
    </header>

    <section v-if="templates.items.length === 0" class="empty surface">
      <h2 class="section-title">Você ainda não tem modelos</h2>
      <p class="muted">Envie a arte do certificado em PDF, PNG ou JPG e posicione os campos que mudam em cada certificado.</p>
      <button type="button" class="btn btn--primary" @click="creating = true">
        <Plus :size="18" aria-hidden="true" />
        Criar novo modelo
      </button>
    </section>

    <div v-else class="grid">
      <TemplateCard
        v-for="template in templates.sorted"
        :key="template.id"
        :template="template"
        @duplicate="duplicate(template)"
        @remove="remove(template)"
      />
    </div>

    <NewTemplateDialog :open="creating" @close="creating = false" @created="onCreated" />
  </div>
</template>

<style scoped>
.header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--esp-4);
  margin-bottom: var(--esp-6);
}

.header p {
  margin-top: var(--esp-1);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--esp-5);
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

.empty p {
  max-width: 48ch;
  margin-bottom: var(--esp-3);
}
</style>
