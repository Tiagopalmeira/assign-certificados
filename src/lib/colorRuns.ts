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
  const plain = [{ text: line, offset: 0, color: base }]
  const matcher = colorizesGraduation(field) ? paletteMatcher(palette) : null
  if (!matcher) return plain

  const pieces: { text: string; color: string }[] = []
  let cursor = 0
  for (const match of line.matchAll(matcher.regex)) {
    const start = match.index ?? 0
    const end = start + match[0].length
    // Só palavras inteiras: "Azulejo" não conta.
    if (isLetter(line[start - 1]) || isLetter(line[end])) continue
    const color = matcher.colors.get(match[0].toLocaleLowerCase('pt-BR'))
    if (!color) continue
    if (start > cursor) pieces.push({ text: line.slice(cursor, start), color: base })
    pieces.push({ text: match[0], color })
    cursor = end
  }
  if (pieces.length === 0) return plain
  if (cursor < line.length) pieces.push({ text: line.slice(cursor), color: base })

  let consumed = ''
  return pieces.map((piece) => {
    const offset = consumed ? metrics.measure(consumed, fontSize) + letterSpacing * [...consumed].length : 0
    consumed += piece.text
    return { ...piece, offset }
  })
}
