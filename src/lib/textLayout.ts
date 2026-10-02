/** Mede a largura de um texto (sem espaçamento extra) num tamanho de fonte. */
export type MeasureText = (text: string, fontSize: number) => number

export interface FontMetrics {
  measure: MeasureText
  /** Ascendente e descendente em unidades de em (descendente positivo). */
  ascent: number
  descent: number
}

export interface LayoutInput {
  text: string
  width: number
  height: number
  fontSize: number
  letterSpacing: number
  lineHeight: number
  align: 'left' | 'center' | 'right'
  multiline: boolean
  shrinkToFit: boolean
}

export interface LayoutLine {
  text: string
  /** Início da linha (já considerando o alinhamento) e linha de base, relativos à caixa. */
  x: number
  baseline: number
  width: number
}

export interface TextLayout {
  fontSize: number
  letterSpacing: number
  lines: LayoutLine[]
}

const MIN_FONT_SIZE = 4

function lineWidth(text: string, size: number, spacing: number, metrics: FontMetrics): number {
  if (!text) return 0
  return metrics.measure(text, size) + spacing * [...text].length
}

function wrapParagraph(paragraph: string, maxWidth: number, size: number, spacing: number, metrics: FontMetrics): string[] {
  const words = paragraph.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (!current || lineWidth(candidate, size, spacing, metrics) <= maxWidth) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }
  lines.push(current)
  return lines
}

function scaledSpacing(input: LayoutInput, size: number): number {
  return input.fontSize > 0 ? input.letterSpacing * (size / input.fontSize) : 0
}

function breakLines(input: LayoutInput, size: number, metrics: FontMetrics): string[] {
  if (!input.multiline) return [input.text.replace(/\s*\r?\n\s*/g, ' ')]
  const spacing = scaledSpacing(input, size)
  return input.text
    .split(/\r?\n/)
    .flatMap((paragraph) => wrapParagraph(paragraph, input.width, size, spacing, metrics))
}

function fits(input: LayoutInput, lines: string[], size: number, metrics: FontMetrics): boolean {
  const spacing = scaledSpacing(input, size)
  const tooWide = lines.some((line) => lineWidth(line, size, spacing, metrics) > input.width + 0.01)
  const totalHeight = lines.length * size * input.lineHeight
  return !tooWide && totalHeight <= input.height + 0.01
}

/**
 * Quebra o texto em linhas e calcula a posição de cada uma, centralizando o bloco na
 * vertical da caixa. A mesma função é usada na prévia (SVG) e na geração do PDF,
 * o que mantém os dois iguais.
 */
export function layoutText(input: LayoutInput, metrics: FontMetrics): TextLayout {
  let size = input.fontSize
  let lines = breakLines(input, size, metrics)

  if (input.shrinkToFit) {
    while (size > MIN_FONT_SIZE && !fits(input, lines, size, metrics)) {
      size = Math.max(MIN_FONT_SIZE, size * 0.95)
      lines = breakLines(input, size, metrics)
    }
  }

  const spacing = scaledSpacing(input, size)
  const lineBox = size * input.lineHeight
  const blockTop = (input.height - lines.length * lineBox) / 2
  const glyphOffset = lineBox / 2 + ((metrics.ascent - metrics.descent) * size) / 2

  return {
    fontSize: size,
    letterSpacing: spacing,
    lines: lines.map((text, index) => {
      const width = lineWidth(text, size, spacing, metrics)
      const x =
        input.align === 'left' ? 0 : input.align === 'right' ? input.width - width : (input.width - width) / 2
      return { text, x, width, baseline: blockTop + index * lineBox + glyphOffset }
    }),
  }
}

/** Retângulo de uma imagem ajustada dentro da caixa sem distorcer (equivalente a "contain"). */
export function containRect(boxW: number, boxH: number, imgW: number, imgH: number) {
  if (imgW <= 0 || imgH <= 0) return { x: 0, y: 0, width: boxW, height: boxH }
  const scale = Math.min(boxW / imgW, boxH / imgH)
  const width = imgW * scale
  const height = imgH * scale
  return { x: (boxW - width) / 2, y: (boxH - height) / 2, width, height }
}
