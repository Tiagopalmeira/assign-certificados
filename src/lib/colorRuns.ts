import type { CertificateField } from '@/types'
import type { FontMetrics } from './textLayout'

/** Cor de cada cor de corda que aparece no nome das graduações. */
export const GRADUATION_COLORS: Readonly<Record<string, string>> = {
  verde: '#1B8A3C',
  amarelo: '#F2C200',
  azul: '#1D4FB8',
  branco: '#FFFFFF',
}

export interface TextRun {
  text: string
  /** Distância do início da linha até o início do trecho. */
  offset: number
  color: string
}

const COLOR_WORD = /(verde|amarelo|azul|branco)/giu

/** O campo "Graduação" pinta cada cor com a própria cor, a não ser que a opção esteja desligada. */
export function colorizesGraduation(field: CertificateField): boolean {
  return field.type === 'graduation' && field.colorizeGraduation !== false
}

function isLetter(char: string | undefined): boolean {
  return Boolean(char && /\p{L}/u.test(char))
}

/**
 * Divide uma linha em trechos com cor própria. Palavras de cor ("Verde", "Amarelo"…) usam a
 * cor correspondente; o resto usa a cor do campo. A posição de cada trecho é calculada com as
 * mesmas métricas do layout, então a prévia e o PDF ficam iguais.
 */
export function colorRuns(
  field: CertificateField,
  line: string,
  fontSize: number,
  letterSpacing: number,
  metrics: FontMetrics,
): TextRun[] {
  const base = field.style.color
  const plain = [{ text: line, offset: 0, color: base }]
  if (!colorizesGraduation(field)) return plain

  const pieces: { text: string; color: string }[] = []
  let cursor = 0
  for (const match of line.matchAll(COLOR_WORD)) {
    const start = match.index ?? 0
    const end = start + match[0].length
    // Só palavras inteiras: "Azulejo" não conta.
    if (isLetter(line[start - 1]) || isLetter(line[end])) continue
    const key = match[0].toLowerCase()
    if (start > cursor) pieces.push({ text: line.slice(cursor, start), color: base })
    pieces.push({ text: match[0], color: GRADUATION_COLORS[key] })
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
