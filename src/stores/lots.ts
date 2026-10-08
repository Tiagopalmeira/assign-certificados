import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { LotRecord } from '@/types'
import { filesRepo, lotsRepo } from '@/lib/db'
import { createId } from '@/lib/ids'
import { useFilesStore } from './files'

export type NewLotRecord = Omit<LotRecord, 'id' | 'createdAt' | 'count'>

/** Histórico dos lotes gerados neste navegador. */
export const useLotsStore = defineStore('lots', () => {
  const items = ref<LotRecord[]>([])
  const loaded = ref(false)

  const sorted = computed(() => [...items.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))

  async function init() {
    if (loaded.value) return
    items.value = await lotsRepo.list()
    loaded.value = true
  }

  function byId(id: string) {
    return items.value.find((lot) => lot.id === id)
  }

  /** Guarda um lote gerado, com uma cópia própria da assinatura. */
  async function record(input: NewLotRecord): Promise<LotRecord> {
    const lot: LotRecord = {
      ...input,
      id: createId(),
      createdAt: new Date().toISOString(),
      signatureId: input.signatureId ? await filesRepo.copy(input.signatureId) : null,
      groups: input.groups.map((group) => ({ ...group, names: [...group.names] })),
      count: input.groups.reduce((total, group) => total + group.names.length, 0),
    }
    await lotsRepo.put(lot)
    items.value.push(lot)
    return lot
  }

  async function remove(id: string) {
    const lot = byId(id)
    if (!lot) return
    await lotsRepo.remove(id)
    if (lot.signatureId) await useFilesStore().remove(lot.signatureId)
    items.value = items.value.filter((item) => item.id !== id)
  }

  return { items, sorted, init, byId, record, remove }
})
