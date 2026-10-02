import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { CertificateTemplate, FontVariant, StoredFile } from '@/types'
import { createId } from './ids'

/**
 * Persistência local no navegador (IndexedDB). Modelos, arquivos (fundos, imagens,
 * assinaturas), fontes enviadas e configurações ficam salvos neste aparelho.
 */
interface CertDB extends DBSchema {
  templates: { key: string; value: CertificateTemplate }
  files: { key: string; value: StoredFile }
  fonts: { key: string; value: FontVariant }
  settings: { key: string; value: unknown }
}

let dbPromise: Promise<IDBPDatabase<CertDB>> | null = null

function db() {
  dbPromise ??= openDB<CertDB>('cert-assign', 1, {
    upgrade(database) {
      database.createObjectStore('templates', { keyPath: 'id' })
      database.createObjectStore('files', { keyPath: 'id' })
      database.createObjectStore('fonts', { keyPath: 'id' })
      database.createObjectStore('settings')
    },
  })
  return dbPromise
}

/** Objetos reativos do Vue não podem ir direto para o IndexedDB; esta cópia remove os proxies. */
function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export const templatesRepo = {
  async list() {
    return (await db()).getAll('templates')
  },
  async get(id: string) {
    return (await db()).get('templates', id)
  },
  async put(template: CertificateTemplate) {
    await (await db()).put('templates', plain(template))
  },
  async remove(id: string) {
    await (await db()).delete('templates', id)
  },
}

export const filesRepo = {
  async get(id: string) {
    return (await db()).get('files', id)
  },
  async save(blob: Blob, name: string): Promise<string> {
    const id = createId()
    await (await db()).put('files', { id, blob, name, type: blob.type, createdAt: new Date().toISOString() })
    return id
  },
  async copy(id: string): Promise<string | null> {
    const file = await this.get(id)
    return file ? this.save(file.blob, file.name) : null
  },
  async remove(id: string) {
    await (await db()).delete('files', id)
  },
}

export const fontsRepo = {
  async list() {
    return (await db()).getAll('fonts')
  },
  async put(font: FontVariant) {
    await (await db()).put('fonts', font)
  },
  async remove(id: string) {
    await (await db()).delete('fonts', id)
  },
}

export const settingsRepo = {
  async get<T>(key: string): Promise<T | undefined> {
    return (await (await db()).get('settings', key)) as T | undefined
  },
  async set(key: string, value: unknown) {
    await (await db()).put('settings', plain(value), key)
  },
}
