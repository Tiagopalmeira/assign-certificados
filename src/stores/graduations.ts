import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { settingsRepo } from '@/lib/db'
import { DEFAULT_GRADUATIONS, graduationLabel, normalizeGraduations, type Graduation } from '@/lib/graduations'

const SETTINGS_KEY = 'graduations'

/**
 * Lista de graduações, cada uma com seu título opcional. Fica salva no banco, então já
 * está pronta para ganhar uma tela de edição: basta chamar `save()` com a nova lista.
 */
export const useGraduationsStore = defineStore('graduations', () => {
  const list = ref<Graduation[]>(DEFAULT_GRADUATIONS.map((g) => ({ ...g })))

  const names = computed(() => list.value.map((g) => g.name))

  /** Títulos por graduação, no formato usado na geração. */
  const titles = computed<Record<string, string>>(() =>
    Object.fromEntries(list.value.map((g) => [g.name, g.title])),
  )

  async function init() {
    const stored = normalizeGraduations(await settingsRepo.get(SETTINGS_KEY))
    if (stored?.length) list.value = stored
  }

  async function save(graduations: Graduation[]) {
    list.value = normalizeGraduations(graduations) ?? []
    await settingsRepo.set(SETTINGS_KEY, list.value)
  }

  function titleOf(name: string): string {
    return titles.value[name] ?? ''
  }

  function labelOf(name: string): string {
    return graduationLabel(name, titleOf(name))
  }

  return { list, names, titles, init, save, titleOf, labelOf }
})
