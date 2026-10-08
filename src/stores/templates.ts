import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { CertificateTemplate } from '@/types'
import { templatesRepo } from '@/lib/db'
import { createId } from '@/lib/ids'
import { todayIso } from '@/lib/dates'
import type { ImportedTemplate } from '@/lib/templateImport'
import { useFilesStore } from './files'

/** Ids de arquivos referenciados por um modelo (fundo, original, imagens, assinatura). */
function fileIdsOf(template: CertificateTemplate): string[] {
  const ids = new Set<string>([template.source.fileId, template.backgroundId])
  if (template.defaults.signatureImageId) ids.add(template.defaults.signatureImageId)
  for (const field of template.fields) if (field.imageId) ids.add(field.imageId)
  return [...ids]
}

export const useTemplatesStore = defineStore('templates', () => {
  const items = ref<CertificateTemplate[]>([])
  const loaded = ref(false)

  const sorted = computed(() => [...items.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))

  async function init() {
    if (loaded.value) return
    items.value = await templatesRepo.list()
    loaded.value = true
  }

  function byId(id: string) {
    return items.value.find((template) => template.id === id)
  }

  async function create(name: string, imported: ImportedTemplate): Promise<CertificateTemplate> {
    const files = useFilesStore()
    const sourceId = await files.save(imported.source, imported.sourceName)
    const backgroundId =
      imported.background === imported.source ? sourceId : await files.save(imported.background, 'fundo.png')
    const now = new Date().toISOString()
    const template: CertificateTemplate = {
      id: createId(),
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
      source: {
        kind: imported.kind,
        fileId: sourceId,
        mimeType: imported.source.type,
        fileName: imported.sourceName,
      },
      backgroundId,
      width: imported.width,
      height: imported.height,
      fields: [],
      defaults: { date: todayIso(), location: '', signerName: '', signatureImageId: null, graduationSystemId: null },
    }
    await templatesRepo.put(template)
    items.value.push(template)
    return template
  }

  async function save(template: CertificateTemplate) {
    const updated = { ...toRawDeep(template), updatedAt: new Date().toISOString() }
    await templatesRepo.put(updated)
    const index = items.value.findIndex((t) => t.id === updated.id)
    if (index >= 0) items.value[index] = updated
    else items.value.push(updated)
    await removeOrphanFiles(template.id)
    return updated
  }

  /** Remove do banco imagens que o modelo deixou de usar (ex.: assinatura trocada). */
  const knownFiles = new Map<string, Set<string>>()
  async function removeOrphanFiles(templateId: string) {
    const template = byId(templateId)
    if (!template) return
    const current = new Set(fileIdsOf(template))
    const previous = knownFiles.get(templateId)
    knownFiles.set(templateId, current)
    if (!previous) return
    const files = useFilesStore()
    for (const id of previous) if (!current.has(id)) await files.remove(id)
  }

  /** Registra os arquivos atuais de um modelo antes da edição, para limpar órfãos ao salvar. */
  function trackFiles(templateId: string) {
    const template = byId(templateId)
    if (template) knownFiles.set(templateId, new Set(fileIdsOf(template)))
  }

  async function duplicate(id: string) {
    const original = byId(id)
    if (!original) return null
    const files = useFilesStore()
    const copy = toRawDeep(original)
    const idMap = new Map<string, string>()
    for (const fileId of fileIdsOf(original)) {
      const blob = await files.getBlob(fileId)
      if (blob) idMap.set(fileId, await files.save(blob, 'copia'))
    }
    const mapId = (fileId: string | null) => (fileId ? idMap.get(fileId) ?? fileId : null)
    const now = new Date().toISOString()
    copy.id = createId()
    copy.name = `${original.name} (cópia)`
    copy.createdAt = now
    copy.updatedAt = now
    copy.source.fileId = mapId(copy.source.fileId) ?? copy.source.fileId
    copy.backgroundId = mapId(copy.backgroundId) ?? copy.backgroundId
    copy.defaults.signatureImageId = mapId(copy.defaults.signatureImageId)
    copy.fields = copy.fields.map((field) => ({ ...field, id: createId(), imageId: mapId(field.imageId) }))
    await templatesRepo.put(copy)
    items.value.push(copy)
    return copy
  }

  async function remove(id: string) {
    const template = byId(id)
    if (!template) return
    const files = useFilesStore()
    for (const fileId of fileIdsOf(template)) await files.remove(fileId)
    await templatesRepo.remove(id)
    items.value = items.value.filter((t) => t.id !== id)
    knownFiles.delete(id)
  }

  /** Quantos modelos usam uma família de fonte. */
  function usageOfFont(family: string) {
    return items.value.filter((t) => t.fields.some((f) => f.style.fontFamily === family)).length
  }

  return { items, sorted, loaded, init, byId, create, save, duplicate, remove, trackFiles, usageOfFont }
})

/** Copia profunda sem proxies do Vue (structuredClone não aceita Proxy). */
function toRawDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
