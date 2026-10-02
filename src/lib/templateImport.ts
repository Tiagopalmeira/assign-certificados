import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { PDFDocument } from 'pdf-lib'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export const ACCEPTED_TEMPLATE_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
export const ACCEPTED_TEMPLATE_EXTENSIONS = '.pdf,.png,.jpg,.jpeg'

/** Largura da imagem de fundo usada no editor (em pixels). */
const BACKGROUND_WIDTH = 2000

export interface ImportedTemplate {
  kind: 'pdf' | 'image'
  /** Arquivo usado na geração: o PDF original ou uma imagem PNG/JPG. */
  source: Blob
  sourceName: string
  background: Blob
  width: number
  height: number
  /** Avisos para mostrar ao usuário (ex.: só a primeira página foi usada). */
  notices: string[]
}

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível gerar a imagem.'))), type, quality)
  })
}

export function detectTemplateType(file: File): 'pdf' | 'image' | null {
  const name = file.name.toLowerCase()
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (['image/png', 'image/jpeg'].includes(file.type) || /\.(png|jpe?g)$/.test(name)) return 'image'
  return null
}

/** Tamanho de página para modelos em imagem: largura de uma folha A4 (em pontos), mantendo a proporção. */
function pageSizeForImage(pixelWidth: number, pixelHeight: number) {
  const width = pixelWidth >= pixelHeight ? 842 : 595
  return { width, height: (width * pixelHeight) / pixelWidth }
}

async function importImage(file: File): Promise<ImportedTemplate> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Não foi possível abrir a imagem. Envie um arquivo PNG ou JPG válido.')
  })
  const size = pageSizeForImage(bitmap.width, bitmap.height)
  bitmap.close()
  return { kind: 'image', source: file, sourceName: file.name, background: file, ...size, notices: [] }
}

async function importPdf(file: File): Promise<ImportedTemplate> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjs.getDocument({ data: bytes.slice() })
  let pdf: pdfjs.PDFDocumentProxy
  try {
    pdf = await loadingTask.promise
  } catch {
    throw new Error('Não foi possível abrir o PDF. Verifique se o arquivo não está corrompido ou protegido por senha.')
  }

  const notices: string[] = []
  if (pdf.numPages > 1) notices.push(`O PDF tem ${pdf.numPages} páginas. Só a primeira será usada como modelo.`)

  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const scale = BACKGROUND_WIDTH / viewport.width
  const scaled = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(scaled.width)
  canvas.height = Math.round(scaled.height)
  await page.render({ canvas, viewport: scaled }).promise
  const background = await canvasToBlob(canvas)
  const rotation = page.rotate
  await loadingTask.destroy()

  // Usamos o PDF original (vetorial) na geração quando o pdf-lib consegue lê-lo e a página
  // não está girada. Caso contrário, a página renderizada vira um modelo em imagem.
  let vectorUsable = rotation % 360 === 0
  if (vectorUsable) {
    try {
      await PDFDocument.load(bytes)
    } catch {
      vectorUsable = false
    }
  }

  if (!vectorUsable) {
    return {
      kind: 'image',
      source: background,
      sourceName: file.name.replace(/\.pdf$/i, '.png'),
      background,
      width: viewport.width,
      height: viewport.height,
      notices,
    }
  }
  return {
    kind: 'pdf',
    source: file,
    sourceName: file.name,
    background,
    width: viewport.width,
    height: viewport.height,
    notices,
  }
}

export async function importTemplateFile(file: File): Promise<ImportedTemplate> {
  const type = detectTemplateType(file)
  if (type === 'pdf') return importPdf(file)
  if (type === 'image') return importImage(file)
  throw new Error('Formato não aceito. Envie um arquivo PDF, PNG ou JPG.')
}
