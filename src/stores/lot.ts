import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { CertificateBatch, CertificateTemplate, Student, StudentGroup } from '@/types'
import { createId } from '@/lib/ids'
import { todayIso } from '@/lib/dates'
import { graduationLabel, titleOf } from '@/lib/graduationSystems'
import { useFilesStore } from './files'
import { useGraduationSystemsStore } from './graduationSystems'

const STORAGE_KEY = 'cert-assign:lot-draft'

export interface LotDraft {
  templateId: string
  /** Sistema de graduação dos alunos deste lote. */
  systemId: string | null
  dateMode: 'template' | 'custom'
  customDate: string
  location: string
  signerName: string
  /** true = usar a imagem de assinatura do modelo; false = usar a nova (ou nenhuma). */
  useTemplateSignature: boolean
  newSignatureId: string | null
  groups: StudentGroup[]
}

function emptyDraft(template: CertificateTemplate, systemId: string | null): LotDraft {
  return {
    templateId: template.id,
    systemId,
    dateMode: 'template',
    customDate: template.defaults.date || todayIso(),
    location: template.defaults.location,
    signerName: template.defaults.signerName,
    useTemplateSignature: Boolean(template.defaults.signatureImageId),
    newSignatureId: null,
    groups: [],
  }
}

function readStoredDraft(): LotDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LotDraft) : null
  } catch {
    return null
  }
}

/**
 * Lote em montagem. O rascunho fica salvo no navegador para que os nomes digitados não
 * se percam se a página for recarregada.
 */
export const useLotStore = defineStore('lot', () => {
  const draft = ref<LotDraft | null>(readStoredDraft())
  const systems = useGraduationSystemsStore()

  /** Sistema de graduação do lote (ou o padrão, se o escolhido foi excluído). */
  const system = computed(() => systems.resolve(draft.value?.systemId))

  function defaultSystemId(): string | null {
    return systems.fallback?.id ?? null
  }

  watch(
    draft,
    (value) => {
      try {
        if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
        else localStorage.removeItem(STORAGE_KEY)
      } catch {
        // Sem armazenamento disponível: o rascunho vale só para esta sessão.
      }
    },
    { deep: true },
  )

  /** Começa um lote para o modelo, retomando o rascunho se for do mesmo modelo. */
  function start(template: CertificateTemplate) {
    if (draft.value?.templateId === template.id) {
      if (!template.defaults.signatureImageId) draft.value.useTemplateSignature = false
      // Rascunhos de versões anteriores não tinham sistema.
      if (!systems.byId(draft.value.systemId)) draft.value.systemId = system.value?.id ?? defaultSystemId()
      return
    }
    void discardNewSignature()
    draft.value = emptyDraft(template, defaultSystemId())
  }

  async function reset(template: CertificateTemplate) {
    await discardNewSignature()
    draft.value = emptyDraft(template, draft.value?.systemId ?? defaultSystemId())
  }

  /** Troca o sistema de graduação. Os grupos de alunos são do sistema anterior e saem. */
  function setSystem(systemId: string) {
    if (!draft.value || draft.value.systemId === systemId) return
    draft.value.systemId = systemId
    draft.value.groups = []
  }

  /** Graduação com o título do sistema do lote: "Branco - Mestre". */
  function labelOf(graduation: string): string {
    return graduationLabel(graduation, titleOf(system.value, graduation))
  }

  async function discardNewSignature() {
    const id = draft.value?.newSignatureId
    if (!id) return
    draft.value!.newSignatureId = null
    await useFilesStore().remove(id)
  }

  async function setNewSignature(blob: Blob) {
    if (!draft.value) return
    await discardNewSignature()
    draft.value.newSignatureId = await useFilesStore().save(blob, 'assinatura.png')
    draft.value.useTemplateSignature = false
  }

  function addGroup(graduation: string, names: string[]) {
    if (!draft.value || names.length === 0) return
    const existing = draft.value.groups.find((group) => group.graduation === graduation)
    if (existing) existing.names.push(...names)
    else draft.value.groups.push({ id: createId(), graduation, names: [...names] })
  }

  function updateGroup(groupId: string, graduation: string, names: string[]) {
    if (!draft.value) return
    const group = draft.value.groups.find((g) => g.id === groupId)
    if (!group) return
    if (names.length === 0) return removeGroup(groupId)
    const sameGraduation = draft.value.groups.find((g) => g.id !== groupId && g.graduation === graduation)
    if (sameGraduation) {
      sameGraduation.names.push(...names)
      removeGroup(groupId)
    } else {
      group.graduation = graduation
      group.names = [...names]
    }
  }

  function removeGroup(groupId: string) {
    if (!draft.value) return
    draft.value.groups = draft.value.groups.filter((group) => group.id !== groupId)
  }

  function removeStudent(groupId: string, index: number) {
    const group = draft.value?.groups.find((g) => g.id === groupId)
    if (!group) return
    group.names.splice(index, 1)
    if (group.names.length === 0) removeGroup(groupId)
  }

  const students = computed<Student[]>(() =>
    (draft.value?.groups ?? []).flatMap((group) =>
      group.names.map((name) => ({ name, graduation: group.graduation })),
    ),
  )

  const summary = computed(() =>
    (draft.value?.groups ?? []).map((group) => ({ graduation: group.graduation, count: group.names.length })),
  )

  function effectiveDate(template: CertificateTemplate) {
    if (!draft.value) return template.defaults.date
    return draft.value.dateMode === 'custom' ? draft.value.customDate : template.defaults.date
  }

  function signatureId(template: CertificateTemplate): string | null {
    if (!draft.value) return template.defaults.signatureImageId
    return draft.value.useTemplateSignature ? template.defaults.signatureImageId : draft.value.newSignatureId
  }

  /** Lote no formato final usado pela geração. */
  function toBatch(template: CertificateTemplate): CertificateBatch {
    return {
      templateId: template.id,
      date: effectiveDate(template),
      location: draft.value?.location.trim() ?? template.defaults.location,
      signerName: draft.value?.signerName.trim() ?? template.defaults.signerName,
      signatureId: signatureId(template),
      students: students.value,
    }
  }

  return {
    draft,
    system,
    setSystem,
    labelOf,
    students,
    summary,
    start,
    reset,
    setNewSignature,
    discardNewSignature,
    addGroup,
    updateGroup,
    removeGroup,
    removeStudent,
    effectiveDate,
    signatureId,
    toBatch,
  }
})
