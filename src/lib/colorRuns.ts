import type { CertificateField } from '@/types'
import type { ColorWord } from './graduationSystems'
import type { FontMetrics } from './textLayout'

export interface TextRun {
  text: string
  /** Distância do início da linha até o início do trecho. */
  offset: number
  color: string
}

/** O campo "Graduação" pinta as cores com a própria cor, a não ser que a opção esteja desligada. */
export function colorizesGraduation(field: CertificateField): boolean {
  return field.type === 'graduation' && field.colorizeGraduation !== false
}

function isLetter(char: string | undefined): boolean {
  return Boolean(char && /\p{L}/u.test(char))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Expressão que acha as palavras da paleta; as mais longas primeiro ("Verde-limão" antes de "Verde"). */
function paletteMatcher(palette: readonly ColorWord[]): { regex: RegExp; colors: Map<string, string> } | null {
  const valid = palette.filter((c) => c.word.trim())
  if (valid.length === 0) return null
  const colors = new Map(valid.map((c) => [c.word.trim().toLocaleLowerCase('pt-BR'), c.hex]))
  const alternatives = [...colors.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp)
  return { regex: new RegExp(`(${alternatives.join('|')})`, 'giu'), colors }
}

export interface ColorSegment {
  text: string
  /** Cor da palavra da paleta, ou null para o texto comum. */
  color: string | null
}

/** Divide um texto em trechos: palavras da paleta (com a cor delas) e o resto (sem cor). */
export function paletteSegments(text: string, palette: readonly ColorWord[]): ColorSegment[] {
  const matcher = paletteMatcher(palette)
  if (!matcher) return [{ text, color: null }]
  const segments: ColorSegment[] = []
  let cursor = 0
  for (const match of text.matchAll(matcher.regex)) {
    const start = match.index ?? 0
    const end = start + match[0].length
    // Só palavras inteiras: "Azulejo" não conta.
    if (isLetter(text[start - 1]) || isLetter(text[end])) continue
    const color = matcher.colors.get(match[0].toLocaleLowerCase('pt-BR'))
    if (!color) continue
    if (start > cursor) segments.push({ text: text.slice(cursor, start), color: null })
    segments.push({ text: match[0], color })
    cursor = end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), color: null })
  return segments
}

/** Cores (sem repetir) das palavras da paleta que aparecem no texto. */
export function colorsIn(text: string, palette: readonly ColorWord[]): string[] {
  return [...new Set(paletteSegments(text, palette).flatMap((s) => (s.color ? [s.color] : [])))]
}

/**
 * Divide uma linha em trechos com cor própria. As palavras da paleta do sistema de graduação
 * ("Verde", "Roxa", "Marrom"…) usam a cor correspondente; o resto usa a cor do campo. A posição
 * de cada trecho é calculada com as mesmas métricas do layout, então a prévia e o PDF ficam iguais.
 */
export function colorRuns(
  field: CertificateField,
  line: string,
  fontSize: number,
  letterSpacing: number,
  metrics: FontMetrics,
  palette: readonly ColorWord[],
): TextRun[] {
  const base = field.style.color
  if (!colorizesGraduation(field)) return [{ text: line, offset: 0, color: base }]

  let consumed = ''
  return paletteSegments(line, palette).map((segment) => {
    const offset = consumed ? metrics.measure(consumed, fontSize) + letterSpacing * [...consumed].length : 0
    consumed += segment.text
    return { text: segment.text, offset, color: segment.color ?? base }
  })
}
