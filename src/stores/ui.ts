import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
}

export interface ConfirmRequest {
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
}

/** Avisos rápidos (toasts) e diálogo de confirmação compartilhados pela aplicação. */
export const useUiStore = defineStore('ui', () => {
  const toasts = ref<Toast[]>([])
  const confirmation = ref<(ConfirmRequest & { resolve: (ok: boolean) => void }) | null>(null)
  let nextId = 1

  function notify(message: string, tone: Toast['tone'] = 'success') {
    const id = nextId++
    toasts.value.push({ id, message, tone })
    setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4000)
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function confirm(request: ConfirmRequest): Promise<boolean> {
    confirmation.value?.resolve(false)
    return new Promise((resolve) => {
      confirmation.value = { ...request, resolve }
    })
  }

  function answer(ok: boolean) {
    confirmation.value?.resolve(ok)
    confirmation.value = null
  }

  return { toasts, confirmation, notify, dismiss, confirm, answer }
})

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}
