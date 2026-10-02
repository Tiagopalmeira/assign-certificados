import type { CertificateField } from '@/types'

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Divide o campo "Assinatura" em área da imagem (em cima) e da legenda com o nome
 * (embaixo). Coordenadas relativas ao campo.
 */
export function signatureBoxes(field: CertificateField, hasCaption: boolean): { image: Box; caption: Box } {
  const captionHeight = hasCaption
    ? Math.min(field.height * 0.5, field.style.fontSize * field.style.lineHeight)
    : 0
  return {
    image: { x: 0, y: 0, width: field.width, height: field.height - captionHeight },
    caption: { x: 0, y: field.height - captionHeight, width: field.width, height: captionHeight },
  }
}

export function rotatePoint(x: number, y: number, degrees: number) {
  const rad = (degrees * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { x: x * cos - y * sin, y: x * sin + y * cos }
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function round(value: number, decimals = 1) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
