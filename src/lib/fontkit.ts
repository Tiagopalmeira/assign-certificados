import type { Font } from '@pdf-lib/fontkit'
// O build ESM exporta "default"; a tipagem só declara exports nomeados, por isso o cast abaixo.
import fontkitDefault from '@pdf-lib/fontkit'

export interface FontkitModule {
  create(buffer: Uint8Array): Font
}

/** Instância única do fontkit, usada para medir textos e registrada no pdf-lib. */
export const fontkit = fontkitDefault as FontkitModule
