/** Converte "#RRGGBB" ou "#RGB" em componentes de 0 a 1. Valores inválidos viram preto. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let value = hex.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(value)) value = value.split('').map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(value)) return { r: 0, g: 0, b: 0 }
  const n = parseInt(value, 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}

export function isValidHex(hex: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex.trim())
}
