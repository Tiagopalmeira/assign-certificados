<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterLink, onBeforeRouteLeave, useRouter } from 'vue-router'
import { ArrowLeft, Redo2, Undo2 } from 'lucide-vue-next'
import { createTemplateEditor, provideTemplateEditor } from '@/composables/useTemplateEditor'
import { useTemplatesStore } from '@/stores/templates'
import { errorMessage, useUiStore } from '@/stores/ui'
import CertificateCanvas from '@/components/certificate/CertificateCanvas.vue'
import FieldToolbar from '@/components/certificate/FieldToolbar.vue'
import FieldProperties from '@/components/certificate/FieldProperties.vue'
import TemplateSettings from '@/components/certificate/TemplateSettings.vue'

const props = defineProps<{ id: string }>()

const templates = useTemplatesStore()
const ui = useUiStore()
const router = useRouter()

const original = templates.byId(props.id)
const editor = original ? createTemplateEditor(original) : null
if (editor) provideTemplateEditor(editor)

async function save(showToast = true) {
  if (!editor) return false
  if (!editor.template.value.name.trim()) {
    ui.notify('Dê um nome para o modelo antes de salvar.', 'error')
    return false
  }
  try {
    await editor.save()
    if (showToast) ui.notify('Modelo salvo.')
    return true
  } catch (error) {
    ui.notify(errorMessage(error, 'Não foi possível salvar o modelo.'), 'error')
    return false
  }
}

async function generate() {
  if (!editor) return
  if (editor.template.value.fields.length === 0) {
    ui.notify('Adicione pelo menos um campo ao modelo antes de gerar certificados.', 'error')
    return
  }
  if (editor.dirty.value && !(await save(false))) return
  router.push(`/modelos/${props.id}/lote`)
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return Boolean(el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)))
}

function onKeydown(event: KeyboardEvent) {
  if (!editor || ui.confirmation) return
  const mod = event.ctrlKey || event.metaKey
  if (mod && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void save()
    return
  }
  if (isTyping(event.target)) return
  if (mod && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey) editor.redo()
    else editor.undo()
    return
  }
  if (mod && event.key.toLowerCase() === 'y') {
    event.preventDefault()
    editor.redo()
    return
  }
  const field = editor.selected.value
  if (!field) return
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    editor.removeField(field.id)
  } else if (mod && event.key.toLowerCase() === 'd') {
    event.preventDefault()
    editor.duplicateField(field.id)
  } else if (event.key === 'Escape') {
    editor.selectedId.value = null
  } else if (event.key.startsWith('Arrow')) {
    event.preventDefault()
    const step = event.shiftKey ? 10 : 1
    const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
    const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
    editor.updateField(field.id, { x: field.x + dx, y: field.y + dy })
  }
}

function onKeyup(event: KeyboardEvent) {
  if (editor && event.key.startsWith('Arrow') && !isTyping(event.target)) editor.commit()
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (editor?.dirty.value) event.preventDefault()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('keyup', onKeyup)
  window.addEventListener('beforeunload', onBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('keyup', onKeyup)
  window.removeEventListener('beforeunload', onBeforeUnload)
})

onBeforeRouteLeave(async () => {
  if (!editor?.dirty.value) return true
  return ui.confirm({
    title: 'Sair sem salvar?',
    message: 'As alterações feitas neste modelo serão perdidas.',
    confirmLabel: 'Sair sem salvar',
    cancelLabel: 'Continuar editando',
    danger: true,
  })
})
</script>

<template>
  <div v-if="!editor" class="page page--narrow">
    <h1 class="page-title">Modelo não encontrado</h1>
    <p class="muted missing">Ele pode ter sido excluído ou estar salvo em outro navegador.</p>
    <RouterLink to="/modelos" class="btn btn--primary">Ver meus modelos</RouterLink>
  </div>

  <div v-else class="editor">
    <header class="topbar">
      <RouterLink to="/modelos" class="btn btn--ghost btn--icon" aria-label="Voltar para meus modelos" title="Meus modelos">
        <ArrowLeft :size="18" aria-hidden="true" />
      </RouterLink>
      <div class="topbar__name">
        <label for="template-name" class="visually-hidden">Nome do modelo</label>
        <input
          id="template-name"
          v-model="editor.template.value.name"
          class="name-input"
          type="text"
          placeholder="Nome do modelo"
          @change="editor.commit()"
        />
        <span class="topbar__status" aria-live="polite">
          {{ editor.saving.value ? 'Salvando…' : editor.dirty.value ? 'Alterações não salvas' : 'Tudo salvo' }}
        </span>
      </div>
      <div class="topbar__actions">
        <button type="button" class="btn btn--ghost btn--icon" :disabled="!editor.canUndo.value" aria-label="Desfazer" title="Desfazer (Ctrl+Z)" @click="editor.undo()">
          <Undo2 :size="18" aria-hidden="true" />
        </button>
        <button type="button" class="btn btn--ghost btn--icon" :disabled="!editor.canRedo.value" aria-label="Refazer" title="Refazer (Ctrl+Shift+Z)" @click="editor.redo()">
          <Redo2 :size="18" aria-hidden="true" />
        </button>
        <button type="button" class="btn btn--secondary" :disabled="editor.saving.value || !editor.dirty.value" @click="save()">
          {{ editor.saving.value ? 'Salvando…' : 'Salvar alterações' }}
        </button>
        <button type="button" class="btn btn--primary" :disabled="editor.saving.value" @click="generate">Gerar certificados</button>
      </div>
    </header>

    <div class="workspace">
      <aside class="panel panel--left" aria-label="Campos">
        <FieldToolbar />
      </aside>
      <section class="stage" aria-label="Certificado">
        <CertificateCanvas />
      </section>
      <aside class="panel panel--right" aria-label="Propriedades">
        <FieldProperties v-if="editor.selected.value" :key="editor.selected.value.id" :field="editor.selected.value" />
        <TemplateSettings v-else />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.missing {
  margin: var(--esp-2) 0 var(--esp-5);
}

.editor {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 61px);
  height: calc(100dvh - 61px);
}

.topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-3);
  padding: var(--esp-2) var(--esp-4);
  background: var(--cor-fundo);
  border-bottom: 1px solid var(--cor-borda);
}

.topbar__name {
  display: flex;
  flex: 1;
  align-items: baseline;
  gap: var(--esp-3);
  min-width: 200px;
}

.name-input {
  min-width: 0;
  max-width: 420px;
  flex: 1;
  min-height: 36px;
  padding: 0 var(--esp-2);
  border: 1px solid transparent;
  border-radius: var(--raio);
  background: none;
  color: var(--cor-texto);
  font: inherit;
  font-size: var(--texto-lg);
  font-weight: var(--peso-forte);
}

.name-input:hover {
  border-color: var(--cor-borda);
}

.name-input:focus-visible {
  outline: 2px solid var(--cor-primaria);
  outline-offset: 0;
}

.topbar__status {
  font-size: var(--texto-sm);
  color: var(--cor-texto-secundario);
  white-space: nowrap;
}

.topbar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-2);
}

.workspace {
  flex: 1;
  display: grid;
  grid-template-columns: 276px minmax(0, 1fr) 320px;
  min-height: 0;
}

.panel {
  padding: var(--esp-5) var(--esp-4);
  overflow-x: hidden;
  overflow-y: auto;
  background: var(--cor-fundo);
}

.panel--left {
  border-right: 1px solid var(--cor-borda);
}

.panel--right {
  border-left: 1px solid var(--cor-borda);
}

.stage {
  min-width: 0;
  min-height: 0;
  background: var(--cor-fundo-alt);
}

@media (max-width: 1100px) {
  .workspace {
    grid-template-columns: 260px minmax(0, 1fr) 288px;
  }
}

/* Em telas pequenas, o editor vira uma coluna: campos, certificado e propriedades. */
@media (max-width: 860px) {
  .editor {
    height: auto;
  }

  .workspace {
    display: flex;
    flex-direction: column;
  }

  .panel--left,
  .panel--right {
    border: 0;
    border-bottom: 1px solid var(--cor-borda);
    overflow: visible;
  }

  .stage {
    height: 70vh;
    min-height: 320px;
    border-bottom: 1px solid var(--cor-borda);
  }

  .topbar__actions {
    width: 100%;
  }

  .topbar__actions .btn--primary,
  .topbar__actions .btn--secondary {
    flex: 1;
  }
}
</style>
