import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { graduationSystemsRepo, settingsRepo } from '@/lib/db'
import {
  GRADUATION_PRESETS,
  emptySystem,
  systemFromLegacyList,
  systemFromPreset,
  type GraduationPreset,
  type GraduationSystem,
} from '@/lib/graduationSystems'
import { createId } from '@/lib/ids'

/** Marca que as listas prontas já foram adicionadas (para não voltarem depois de excluídas). */
const SEEDED_KEY = 'graduationSystemsSeeded'
/** Lista de capoeira salva por versões anteriores. */
const LEGACY_KEY = 'graduations'

/** Sistemas de graduação (capoeira, judô, jiu-jitsu…), salvos no navegador. */
export const useGraduationSystemsStore = defineStore('graduationSystems', () => {
  const items = ref<GraduationSystem[]>([])

  const sorted = computed(() => [...items.value].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))

  async function init() {
    items.value = await graduationSystemsRepo.list()
    if (await settingsRepo.get<boolean>(SEEDED_KEY)) return

    // Primeira vez: as listas prontas entram; a capoeira vem da lista antiga, se houver.
    const now = new Date().toISOString()
    const legacy = systemFromLegacyList(await settingsRepo.get(LEGACY_KEY))
    const seeded = GRADUATION_PRESETS.map((preset) =>
      preset.id === 'capoeira' && legacy ? legacy : systemFromPreset(preset, now),
    )
    for (const system of seeded) await graduationSystemsRepo.put(system)
    await settingsRepo.set(SEEDED_KEY, true)
    items.value = [...items.value, ...seeded]
  }

  function byId(id: string | null | undefined) {
    return id ? items.value.find((system) => system.id === id) : undefined
  }

  /** Sistema usado quando nenhum foi escolhido: o primeiro em ordem alfabética. */
  const fallback = computed(() => sorted.value[0] ?? null)

  /** O sistema pedido ou, se ele não existir mais, o padrão. */
  function resolve(id: string | null | undefined): GraduationSystem | null {
    return byId(id) ?? fallback.value
  }

  async function save(system: GraduationSystem) {
    const updated: GraduationSystem = JSON.parse(JSON.stringify({ ...system, updatedAt: new Date().toISOString() }))
    await graduationSystemsRepo.put(updated)
    const index = items.value.findIndex((s) => s.id === updated.id)
    if (index >= 0) items.value[index] = updated
    else items.value.push(updated)
    return updated
  }

  async function createFromPreset(preset: GraduationPreset) {
    return save(systemFromPreset(preset))
  }

  async function createEmpty() {
    return save(emptySystem())
  }

  async function duplicate(id: string) {
    const original = byId(id)
    if (!original) return null
    const now = new Date().toISOString()
    return save({
      ...JSON.parse(JSON.stringify(original)),
      id: createId(),
      name: `${original.name} (cópia)`,
      levels: original.levels.map((level) => ({ ...level, id: createId() })),
      createdAt: now,
      updatedAt: now,
    })
  }

  async function remove(id: string) {
    await graduationSystemsRepo.remove(id)
    items.value = items.value.filter((system) => system.id !== id)
  }

  return { items, sorted, fallback, init, byId, resolve, save, createFromPreset, createEmpty, duplicate, remove }
})
