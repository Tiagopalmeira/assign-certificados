/** Maior lado da assinatura processada, em pixels. */
const MAX_SIZE = 1600

export interface ProcessedSignature {
  blob: Blob
  width: number
  height: number
}

/** Limiar de Otsu: separa a tinta (escura) do papel (claro) pelo histograma. */
function otsuThreshold(luminance: Uint8ClampedArray): number {
  const histogram = new Array<number>(256).fill(0)
  for (const value of luminance) histogram[value]++
  const total = luminance.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * histogram[i]
  let sumBackground = 0
  let weightBackground = 0
  let best = 0
  let threshold = 128
  for (let i = 0; i < 256; i++) {
    weightBackground += histogram[i]
    if (weightBackground === 0) continue
    const weightForeground = total - weightBackground
    if (weightForeground === 0) break
    sumBackground += i * histogram[i]
    const meanBackground = sumBackground / weightBackground
    const meanForeground = (sum - sumBackground) / weightForeground
    const between = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2
    if (between > best) {
      best = between
      threshold = i
    }
  }
  return threshold
}

/**
 * Remove o fundo de uma foto/escaneamento de assinatura: o traço vira preto e o resto
 * fica transparente, com borda suave. Depois recorta as margens vazias.
 *
 * @param sensitivity de 0 a 1. Valores maiores mantêm traços mais claros.
 */
export async function removeSignatureBackground(file: Blob, sensitivity = 0.5): Promise<ProcessedSignature> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Não foi possível abrir a imagem. Envie um arquivo PNG ou JPG válido.')
  })
  const scale = Math.min(1, MAX_SIZE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Seu navegador não permite processar imagens.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const image = context.getImageData(0, 0, width, height)
  const data = image.data
  const luminance = new Uint8ClampedArray(width * height)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    luminance[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }

  const threshold = Math.min(245, Math.max(20, otsuThreshold(luminance) + (sensitivity - 0.5) * 120))
  const band = 24
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let p = 0; p < luminance.length; p++) {
    const alpha = Math.round(Math.min(1, Math.max(0, (threshold + band / 2 - luminance[p]) / band)) * 255)
    const i = p * 4
    data[i] = 0
    data[i + 1] = 0
    data[i + 2] = 0
    data[i + 3] = alpha
    if (alpha > 40) {
      const x = p % width
      const y = (p - x) / width
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  if (maxX < 0) {
    throw new Error('Não encontramos a assinatura na imagem. Use uma foto com traço escuro sobre fundo claro.')
  }

  context.putImageData(image, 0, 0)
  const padding = Math.round(Math.max(maxX - minX, maxY - minY) * 0.03)
  const cropX = Math.max(0, minX - padding)
  const cropY = Math.max(0, minY - padding)
  const cropW = Math.min(width, maxX + padding + 1) - cropX
  const cropH = Math.min(height, maxY + padding + 1) - cropY

  const output = document.createElement('canvas')
  output.width = cropW
  output.height = cropH
  output.getContext('2d')?.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

  const blob = await new Promise<Blob>((resolve, reject) =>
    output.toBlob((b) => (b ? resolve(b) : reject(new Error('Não foi possível gerar a imagem.'))), 'image/png'),
  )
  return { blob, width: cropW, height: cropH }
}
