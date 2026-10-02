import { computed, inject, provide, reactive, ref, type InjectionKey } from 'vue'
import type { CertificateField, CertificateTemplate, FieldType, TemplateDefaults } from '@/types'
import { cloneField, createField } from '@/lib/fields'
import { useTemplatesStore } from '@/stores/templates'

const HISTORY_LIMIT = 100

type Snapshot = Pick<CertificateTemplate, 'name' | 'fields' | 'defaults'>

function snapshotOf(template: CertificateTemplate): string {
  const { name, fields, defaults } = template
  return JSON.stringify({ name, fields, defaults } satisfies Snapshot)
}

/**
 * Estado do editor: uma cópia de trabalho do modelo, o campo selecionado, desfazer/refazer
 * e o salvamento. As mudanças só vão para o banco ao salvar.
 */
export function createTemplateEditor(original: CertificateTemplate) {
  const templates = useTemplatesStore()
  const template = ref<CertificateTemplate>(JSON.parse(JSON.stringify(original)))
  const selectedId = ref<string | null>(null)
  const savedSnapshot = ref(snapshotOf(template.value))
  const history = ref<string[]>([savedSnapshot.value])
  const historyIndex = ref(0)
  const saving = ref(false)
  /** Guias de centro exibidas enquanto um campo é arrastado. */
  const guides = reactive({ vertical: false, horizontal: false })

  templates.trackFiles(original.id)

  const selected = computed(() => template.value.fields.find((f) => f.id === selectedId.value) ?? null)
  const dirty = computed(() => snapshotOf(template.value) !== savedSnapshot.value)
  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  /** Registra o estado atual no histórico (chamado ao fim de cada ação do usuário). */
  function commit() {
    const current = snapshotOf(template.value)
    if (current === history.value[historyIndex.value]) return
    history.value = history.value.slice(0, historyIndex.value + 1)
    history.value.push(current)
    if (history.value.length > HISTORY_LIMIT) history.value.shift()
    historyIndex.value = history.value.length - 1
  }

  function restore(serialized: string) {
    const snapshot = JSON.parse(serialized) as Snapshot
    template.value.name = snapshot.name
    template.value.fields = snapshot.fields
    template.value.defaults = snapshot.defaults
    if (selectedId.value && !snapshot.fields.some((f) => f.id === selectedId.value)) selectedId.value = null
  }

  function undo() {
    if (!canUndo.value) return
    historyIndex.value--
    restore(history.value[historyIndex.value])
  }

  function redo() {
    if (!canRedo.value) return
    historyIndex.value++
    restore(history.value[historyIndex.value])
  }

  function field(id: string) {
    return template.value.fields.find((f) => f.id === id)
  }

  function addField(type: FieldType) {
    const created = createField(type, template.value.width, template.value.height)
    // Evita empilhar campos novos exatamente no mesmo lugar.
    const overlapping = template.value.fields.filter((f) => f.x === created.x && f.y === created.y).length
    created.y += overlapping * created.height * 1.2
    template.value.fields.push(created)
    selectedId.value = created.id
    commit()
  }

  function updateField(id: string, patch: Partial<CertificateField>) {
    const target = field(id)
    if (target) Object.assign(target, patch)
  }

  function updateStyle(id: string, patch: Partial<CertificateField['style']>) {
    const target = field(id)
    if (target) Object.assign(target.style, patch)
  }

  function updateDefaults(patch: Partial<TemplateDefaults>) {
    Object.assign(template.value.defaults, patch)
  }

  function removeField(id: string) {
    template.value.fields = template.value.fields.filter((f) => f.id !== id)
    if (selectedId.value === id) selectedId.value = null
    commit()
  }

  function duplicateField(id: string) {
    const source = field(id)
    if (!source) return
    const copy = cloneField(source, template.value.width * 0.02)
    template.value.fields.push(copy)
    selectedId.value = copy.id
    commit()
  }

  /** Move o campo para frente/trás na ordem de desenho. */
  function reorder(id: string, direction: 'front' | 'back') {
    const index = template.value.fields.findIndex((f) => f.id === id)
    if (index < 0) return
    const [moved] = template.value.fields.splice(index, 1)
    if (direction === 'front') template.value.fields.push(moved)
    else template.value.fields.unshift(moved)
    commit()
  }

  async function save() {
    saving.value = true
    try {
      commit()
      const saved = await templates.save(template.value)
      template.value.updatedAt = saved.updatedAt
      savedSnapshot.value = snapshotOf(template.value)
    } finally {
      saving.value = false
    }
  }

  return {
    template,
    selectedId,
    selected,
    dirty,
    saving,
    guides,
    canUndo,
    canRedo,
    commit,
    undo,
    redo,
    addField,
    updateField,
    updateStyle,
    updateDefaults,
    removeField,
    duplicateField,
    reorder,
    save,
  }
}

export type TemplateEditor = ReturnType<typeof createTemplateEditor>

const EDITOR_KEY: InjectionKey<TemplateEditor> = Symbol('template-editor')

export function provideTemplateEditor(editor: TemplateEditor) {
  provide(EDITOR_KEY, editor)
}

export function useTemplateEditor(): TemplateEditor {
  const editor = inject(EDITOR_KEY)
  if (!editor) throw new Error('useTemplateEditor precisa estar dentro do editor de modelos.')
  return editor
}
