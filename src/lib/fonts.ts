import type { Font } from '@pdf-lib/fontkit'
import type { FontVariant } from '@/types'
import type { FontMetrics } from './textLayout'
import { fontkit } from './fontkit'
import { toSfnt } from './fontConvert'
import interRegular from '@fontsource/inter/files/inter-latin-400-normal.woff?url'
import interItalic from '@fontsource/inter/files/inter-latin-400-italic.woff?url'
import interBold from '@fontsource/inter/files/inter-latin-700-normal.woff?url'
import interBoldItalic from '@fontsource/inter/files/inter-latin-700-italic.woff?url'
import playfairRegular from '@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff?url'
import playfairItalic from '@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff?url'
import playfairBold from '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff?url'
import playfairBoldItalic from '@fontsource/playfair-display/files/playfair-display-latin-700-italic.woff?url'
import greatVibes from '@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff?url'

function builtin(id: string, family: string, weight: 400 | 700, italic: boolean, url: string): FontVariant {
  return { id, family, weight, italic, source: 'builtin', fileName: url.split('/').pop() ?? id, url }
}

/** Fontes que já vêm com o sistema e não podem ser removidas. */
export const BUILTIN_FONTS: readonly FontVariant[] = [
  builtin('builtin-inter-400', 'Inter', 400, false, interRegular),
  builtin('builtin-inter-400i', 'Inter', 400, true, interItalic),
  builtin('builtin-inter-700', 'Inter', 700, false, interBold),
  builtin('builtin-inter-700i', 'Inter', 700, true, interBoldItalic),
  builtin('builtin-playfair-400', 'Playfair Display', 400, false, playfairRegular),
  builtin('builtin-playfair-400i', 'Playfair Display', 400, true, playfairItalic),
  builtin('builtin-playfair-700', 'Playfair Display', 700, false, playfairBold),
  builtin('builtin-playfair-700i', 'Playfair Display', 700, true, playfairBoldItalic),
  builtin('builtin-greatvibes-400', 'Great Vibes', 400, false, greatVibes),
]

export const ACCEPTED_FONT_EXTENSIONS = ['ttf', 'otf', 'woff', 'woff2']

const bytesCache = new Map<string, Promise<Uint8Array>>()
const fontCache = new Map<string, Promise<Font>>()

/** Bytes da fonte já em TTF/OTF, prontos para o navegador, o fontkit e o PDF. */
export function loadFontBytes(variant: FontVariant): Promise<Uint8Array> {
  let pending = bytesCache.get(variant.id)
  if (!pending) {
    pending = (async () => {
      if (variant.blob) return toSfnt(new Uint8Array(await variant.blob.arrayBuffer()))
      if (!variant.url) throw new Error(`A fonte ${variant.family} não tem arquivo.`)
      const response = await fetch(variant.url)
      if (!response.ok) throw new Error(`Não foi possível carregar a fonte ${variant.family}.`)
      return toSfnt(new Uint8Array(await response.arrayBuffer()))
    })()
    bytesCache.set(variant.id, pending)
    pending.catch(() => bytesCache.delete(variant.id))
  }
  return pending
}

export function loadFontkitFont(variant: FontVariant): Promise<Font> {
  let pending = fontCache.get(variant.id)
  if (!pending) {
    pending = loadFontBytes(variant).then((bytes) => fontkit.create(bytes))
    fontCache.set(variant.id, pending)
    pending.catch(() => fontCache.delete(variant.id))
  }
  return pending
}

export function forgetFont(variantId: string) {
  bytesCache.delete(variantId)
  fontCache.delete(variantId)
}

/**
 * Métricas a partir do fontkit. A largura soma o avanço de cada glifo, exatamente como o
 * pdf-lib faz ao escrever o texto, para que a prévia e o PDF quebrem as linhas igual.
 */
export function metricsFromFont(font: Font): FontMetrics {
  const unitsPerEm = font.unitsPerEm || 1000
  const ascent = (font.ascent || font.bbox.maxY) / unitsPerEm
  const descent = Math.abs(font.descent || font.bbox.minY) / unitsPerEm
  return {
    ascent,
    descent,
    measure(text, size) {
      if (!text) return 0
      const glyphs = font.layout(text).glyphs
      let total = 0
      for (const glyph of glyphs) total += glyph.advanceWidth
      return (total / unitsPerEm) * size
    },
  }
}

/** Nome de família CSS exclusivo de cada variante (o navegador não precisa escolher pesos). */
export function cssFamilyFor(variant: FontVariant): string {
  return `cf-${variant.id}`
}

export interface ResolvedFont {
  variant: FontVariant
  /** Quando a variante pedida não existe, simulamos negrito/itálico (no SVG e no PDF). */
  fauxBold: boolean
  fauxItalic: boolean
}

/** Escolhe a variante mais próxima da família e do estilo pedidos. */
export function resolveFont(
  variants: readonly FontVariant[],
  family: string,
  bold: boolean,
  italic: boolean,
): ResolvedFont {
  let candidates = variants.filter((v) => v.family === family)
  if (candidates.length === 0) candidates = variants.filter((v) => v.family === 'Inter')
  if (candidates.length === 0) candidates = [...variants]
  const weight = bold ? 700 : 400
  const score = (v: FontVariant) => (v.weight === weight ? 0 : 2) + (v.italic === italic ? 0 : 1)
  const variant = [...candidates].sort((a, b) => score(a) - score(b))[0]
  return {
    variant,
    fauxBold: bold && variant.weight < 700,
    fauxItalic: italic && !variant.italic,
  }
}

export const FAUX_ITALIC_SKEW = Math.tan((12 * Math.PI) / 180)
export const FAUX_BOLD_STROKE = 0.03

export interface DetectedFontInfo {
  family: string
  weight: 400 | 700
  italic: boolean
}

/** Lê nome e estilo de dentro do arquivo da fonte. Lança erro se o arquivo não for uma fonte válida. */
export function detectFontInfo(bytes: Uint8Array, fallbackName: string): DetectedFontInfo {
  const font = fontkit.create(bytes)
  const subfamily = font.subfamilyName ?? ''
  const os2 = (font as unknown as { 'OS/2'?: { usWeightClass?: number } })['OS/2']
  const weightClass = os2?.usWeightClass ?? (/bold|black|heavy/i.test(subfamily) ? 700 : 400)
  return {
    family: (font.familyName ?? '').trim() || fallbackName,
    weight: weightClass >= 600 ? 700 : 400,
    italic: Boolean(font.head?.macStyle?.italic) || font.italicAngle !== 0 || /italic|oblique/i.test(subfamily),
  }
}

export function fontFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}
