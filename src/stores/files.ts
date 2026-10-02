import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { filesRepo } from '@/lib/db'

/** URLs temporárias (blob:) para exibir arquivos salvos no banco, com cache por id. */
export const useFilesStore = defineStore('files', () => {
  const urls = reactive<Record<string, string>>({})
  const pending = new Map<string, Promise<string | null>>()

  function load(id: string): Promise<string | null> {
    if (urls[id]) return Promise.resolve(urls[id])
    let promise = pending.get(id)
    if (!promise) {
      promise = filesRepo.get(id).then((file) => {
        pending.delete(id)
        if (!file) return null
        urls[id] = URL.createObjectURL(file.blob)
        return urls[id]
      })
      pending.set(id, promise)
    }
    return promise
  }

  /** Devolve a URL se já estiver carregada; caso contrário, inicia o carregamento e devolve null. */
  function urlFor(id: string | null | undefined): string | null {
    if (!id) return null
    if (!urls[id]) void load(id)
    return urls[id] ?? null
  }

  async function save(blob: Blob, name: string): Promise<string> {
    const id = await filesRepo.save(blob, name)
    urls[id] = URL.createObjectURL(blob)
    return id
  }

  async function remove(id: string) {
    await filesRepo.remove(id)
    if (urls[id]) URL.revokeObjectURL(urls[id])
    delete urls[id]
  }

  async function getBlob(id: string) {
    return (await filesRepo.get(id))?.blob
  }

  return { urlFor, load, save, remove, getBlob }
})
