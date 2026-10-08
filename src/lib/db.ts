import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { CertificateTemplate, FontVariant, LotRecord, StoredFile } from '@/types'
import type { GraduationSystem } from './graduationSystems'
import { createId } from './ids'

/**
 * Persistência local no navegador (IndexedDB). Modelos, arquivos (fundos, imagens,
 * assinaturas), fontes enviadas, sistemas de graduação, lotes gerados e configurações ficam salvos
 * neste aparelho.
 */
interface CertDB extends DBSchema {
  templates: { key: string; value: CertificateTemplate }
  files: { key: string; value: StoredFile }
  fonts: { key: string; value: FontVariant }
  settings: { key: string; value: unknown }
  graduationSystems: { key: string; value: GraduationSystem }
  lots: { key: string; value: LotRecord }
}

let dbPromise: Promise<IDBPDatabase<CertDB>> | null = null

function db() {
  dbPromise ??= openDB<CertDB>('cert-assign', 3, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        database.createObjectStore('templates', { keyPath: 'id' })
        database.createObjectStore('files', { keyPath: 'id' })
        database.createObjectStore('fonts', { keyPath: 'id' })
        database.createObjectStore('settings')
      }
      if (oldVersion < 2) database.createObjectStore('graduationSystems', { keyPath: 'id' })
      if (oldVersion < 3) database.createObjectStore('lots', { keyPath: 'id' })
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

export const graduationSystemsRepo = {
  async list() {
    return (await db()).getAll('graduationSystems')
  },
  async put(system: GraduationSystem) {
    await (await db()).put('graduationSystems', plain(system))
  },
  async remove(id: string) {
    await (await db()).delete('graduationSystems', id)
  },
}

export const lotsRepo = {
  async list() {
    return (await db()).getAll('lots')
  },
  async put(lot: LotRecord) {
    await (await db()).put('lots', plain(lot))
  },
  async remove(id: string) {
    await (await db()).delete('lots', id)
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

/** Tudo o que fica salvo no navegador, para o backup. */
export interface AllData {
  templates: CertificateTemplate[]
  files: StoredFile[]
  fonts: FontVariant[]
  graduationSystems: GraduationSystem[]
  lots: LotRecord[]
  settings: { key: string; value: unknown }[]
}

export async function readAllData(): Promise<AllData> {
  const database = await db()
  const settingKeys = await database.getAllKeys('settings')
  return {
    templates: await database.getAll('templates'),
    files: await database.getAll('files'),
    fonts: await database.getAll('fonts'),
    graduationSystems: await database.getAll('graduationSystems'),
    lots: await database.getAll('lots'),
    settings: await Promise.all(settingKeys.map(async (key) => ({ key, value: await database.get('settings', key) }))),
  }
}

/** Apaga tudo e grava os dados do backup, numa transação só: ou entra tudo, ou nada muda. */
export async function replaceAllData(data: AllData) {
  const database = await db()
  const tx = database.transaction(['templates', 'files', 'fonts', 'graduationSystems', 'lots', 'settings'], 'readwrite')
  const stores = {
    templates: tx.objectStore('templates'),
    files: tx.objectStore('files'),
    fonts: tx.objectStore('fonts'),
    graduationSystems: tx.objectStore('graduationSystems'),
    lots: tx.objectStore('lots'),
    settings: tx.objectStore('settings'),
  }
  await Promise.all([
    ...Object.values(stores).map((store) => store.clear()),
    ...data.templates.map((item) => stores.templates.put(plain(item))),
    ...data.files.map((item) => stores.files.put(item)),
    ...data.fonts.map((item) => stores.fonts.put(item)),
    ...data.graduationSystems.map((item) => stores.graduationSystems.put(plain(item))),
    ...data.lots.map((item) => stores.lots.put(plain(item))),
    ...data.settings.map((item) => stores.settings.put(plain(item.value), item.key)),
    tx.done,
  ])
}
