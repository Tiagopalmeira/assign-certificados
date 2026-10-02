import { defineStore } from 'pinia'
import { ref } from 'vue'
import { settingsRepo } from '@/lib/db'
import { DEFAULT_GRADUATIONS } from '@/lib/graduations'

const SETTINGS_KEY = 'graduations'

/**
 * Lista de graduações. Fica salva no banco, então já está pronta para ganhar uma tela
 * de edição: basta chamar `save()` com a nova lista.
 */
export const useGraduationsStore = defineStore('graduations', () => {
  const list = ref<string[]>([...DEFAULT_GRADUATIONS])

  async function init() {
    const stored = await settingsRepo.get<string[]>(SETTINGS_KEY)
    if (stored?.length) list.value = stored
  }

  async function save(graduations: string[]) {
    list.value = graduations.map((g) => g.trim()).filter(Boolean)
    await settingsRepo.set(SETTINGS_KEY, list.value)
  }

  return { list, init, save }
})
