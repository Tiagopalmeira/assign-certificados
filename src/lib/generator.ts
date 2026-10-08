import {
  PDFDocument,
  type PDFEmbeddedPage,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  TextRenderingMode,
  beginText,
  concatTransformationMatrix,
  drawObject,
  endText,
  popGraphicsState,
  pushGraphicsState,
  setCharacterSpacing,
  setFillingRgbColor,
  setFontAndSize,
  setLineWidth,
  setStrokingRgbColor,
  setTextMatrix,
  setTextRenderingMode,
  showText,
} from 'pdf-lib'
import type {
  CertificateField,
  CertificateTemplate,
  CertificateValues,
  FontVariant,
  GeneratedCertificate,
  Student,
} from '@/types'
import { hexToRgb } from './color'
import { resolveFieldText, isMultiline } from './fieldText'
import { FAUX_BOLD_STROKE, FAUX_ITALIC_SKEW, loadFontBytes, loadFontkitFont, metricsFromFont, resolveFont } from './fonts'
import { fontkit } from './fontkit'
import { containRect, layoutText } from './textLayout'
import { colorRuns } from './colorRuns'
import { titleOf, type ColorWord, type GraduationSystem } from './graduationSystems'
import { signatureBoxes, type Box } from './geometry'
import { sanitizeFileName, uniqueFileNames } from './filename'

export interface GenerationInput {
  template: CertificateTemplate
  date: string
  location: string
  signerName: string
  /** Imagem de assinatura do lote (null = sem imagem). */
  signatureId: string | null
  students: Student[]
  /** Sistema de graduação do lote: títulos e cores das graduações. */
  graduationSystem?: GraduationSystem | null
  fonts: readonly FontVariant[]
  loadFile: (id: string) => Promise<Blob | undefined>
}

export type ProgressCallback = (done: number, total: number) => void

interface LoadedImage {
  bytes: Uint8Array
  isPng: boolean
}

/** Recursos carregados uma vez e reaproveitados em todos os certificados do lote. */
interface SharedResources {
  source: { kind: 'pdf'; doc: PDFDocument } | { kind: 'image'; image: LoadedImage }
  images: Map<string, LoadedImage>
}

/** Recursos embutidos num documento PDF específico. */
interface DocResources {
  fonts: Map<string, PDFFont>
  images: Map<string, PDFImage>
  /** null quando a página do PDF está em branco (sem conteúdo para embutir). */
  background: { kind: 'page'; page: PDFEmbeddedPage } | { kind: 'image'; image: PDFImage } | null
}

async function readImage(blob: Blob): Promise<LoadedImage> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  // Assinatura PNG: 89 50 4E 47
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  return { bytes, isPng }
}

function imageIdFor(field: CertificateField, input: GenerationInput): string | null {
  if (field.type === 'signature') return input.signatureId
  if (field.type === 'image') return field.imageId
  return null
}

async function loadShared(input: GenerationInput): Promise<SharedResources> {
  const sourceBlob = await input.loadFile(input.template.source.fileId)
  if (!sourceBlob) throw new Error('O arquivo do modelo não foi encontrado. Envie o modelo novamente.')

  const source: SharedResources['source'] =
    input.template.source.kind === 'pdf'
      ? { kind: 'pdf', doc: await PDFDocument.load(new Uint8Array(await sourceBlob.arrayBuffer())) }
      : { kind: 'image', image: await readImage(sourceBlob) }

  const images = new Map<string, LoadedImage>()
  for (const field of input.template.fields) {
    const id = imageIdFor(field, input)
    if (!id || images.has(id)) continue
    const blob = await input.loadFile(id)
    if (blob) images.set(id, await readImage(blob))
  }
  return { source, images }
}

async function prepareDoc(doc: PDFDocument, shared: SharedResources): Promise<DocResources> {
  doc.registerFontkit(fontkit as unknown as Parameters<PDFDocument['registerFontkit']>[0])
  let background: DocResources['background'] = null
  if (shared.source.kind === 'pdf') {
    const page = shared.source.doc.getPage(0)
    if (!page.node.Contents()) return { fonts: new Map(), images: new Map(), background }
    const crop = page.getCropBox()
    const embedded = await doc.embedPage(page, {
      left: crop.x,
      bottom: crop.y,
      right: crop.x + crop.width,
      top: crop.y + crop.height,
    })
    background = { kind: 'page', page: embedded }
  } else {
    const { bytes, isPng } = shared.source.image
    background = { kind: 'image', image: isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes) }
  }
  return { fonts: new Map(), images: new Map(), background }
}

async function embeddedFont(doc: PDFDocument, res: DocResources, variant: FontVariant): Promise<PDFFont> {
  let font = res.fonts.get(variant.id)
  if (!font) {
    // loadFontBytes já entrega TTF/OTF. A fonte vai inteira (sem subset): o subset do
    // fontkit falha com algumas fontes, e a fonte inteira funciona em qualquer leitor de PDF.
    font = await doc.embedFont(await loadFontBytes(variant))
    res.fonts.set(variant.id, font)
  }
  return font
}

async function embeddedImage(doc: PDFDocument, res: DocResources, shared: SharedResources, id: string) {
  let image = res.images.get(id)
  if (!image) {
    const loaded = shared.images.get(id)
    if (!loaded) return null
    image = loaded.isPng ? await doc.embedPng(loaded.bytes) : await doc.embedJpg(loaded.bytes)
    res.images.set(id, image)
  }
  return image
}

async function drawTextBox(
  doc: PDFDocument,
  page: PDFPage,
  res: DocResources,
  field: CertificateField,
  text: string,
  box: Box,
  fonts: readonly FontVariant[],
  palette: readonly ColorWord[],
) {
  if (!text.trim() || box.height <= 0) return
  const { style } = field
  const resolved = resolveFont(fonts, style.fontFamily, style.bold, style.italic)
  const metrics = metricsFromFont(await loadFontkitFont(resolved.variant))
  const layout = layoutText(
    {
      text,
      width: box.width,
      height: box.height,
      fontSize: style.fontSize,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      align: style.align,
      multiline: isMultiline(field),
      shrinkToFit: field.shrinkToFit,
    },
    metrics,
  )
  const font = await embeddedFont(doc, res, resolved.variant)
  const fontKey = page.node.newFontDictionary(font.name, font.ref)
  const skew = resolved.fauxItalic ? FAUX_ITALIC_SKEW : 0

  const drawRun = (text: string, x: number, y: number, color: string, mode: TextRenderingMode, lineWidth: number) => {
    const { r, g, b } = hexToRgb(color)
    page.pushOperators(
      beginText(),
      setFontAndSize(fontKey, layout.fontSize),
      setCharacterSpacing(layout.letterSpacing),
      setFillingRgbColor(r, g, b),
      setStrokingRgbColor(r, g, b),
      setTextRenderingMode(mode),
      setLineWidth(lineWidth),
      // Estamos num espaço com o eixo Y invertido (origem no topo); d = -1 desvira o glifo.
      setTextMatrix(1, 0, skew, -1, x, y),
      showText(font.encodeText(text)),
      endText(),
    )
  }

  for (const line of layout.lines) {
    if (!line.text) continue
    const y = box.y + line.baseline
    for (const run of colorRuns(field, line.text, layout.fontSize, layout.letterSpacing, metrics, palette)) {
      const x = box.x + line.x + run.offset
      const mode = resolved.fauxBold ? TextRenderingMode.FillAndOutline : TextRenderingMode.Fill
      drawRun(run.text, x, y, run.color, mode, layout.fontSize * FAUX_BOLD_STROKE)
    }
  }
}

function drawImageBox(page: PDFPage, image: PDFImage, box: Box) {
  if (box.width <= 0 || box.height <= 0) return
  const fit = containRect(box.width, box.height, image.width, image.height)
  const name = page.node.newXObject('Image', image.ref)
  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(fit.width, 0, 0, -fit.height, box.x + fit.x, box.y + fit.y + fit.height),
    drawObject(name),
    popGraphicsState(),
  )
}

async function drawField(
  doc: PDFDocument,
  page: PDFPage,
  res: DocResources,
  shared: SharedResources,
  field: CertificateField,
  values: CertificateValues,
  input: GenerationInput,
) {
  const rad = (field.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const cx = field.width / 2
  const cy = field.height / 2

  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(1, 0, 0, 1, field.x, field.y),
    concatTransformationMatrix(cos, sin, -sin, cos, cx - cos * cx + sin * cy, cy - sin * cx - cos * cy),
  )

  const full: Box = { x: 0, y: 0, width: field.width, height: field.height }
  const imageId = imageIdFor(field, input)

  if (field.type === 'image') {
    const image = imageId ? await embeddedImage(doc, res, shared, imageId) : null
    if (image) drawImageBox(page, image, full)
  } else if (field.type === 'signature') {
    const caption = resolveFieldText(field, values)
    const boxes = signatureBoxes(field, Boolean(caption))
    const image = imageId ? await embeddedImage(doc, res, shared, imageId) : null
    if (image) drawImageBox(page, image, boxes.image)
    await drawTextBox(doc, page, res, field, caption, boxes.caption, input.fonts, values.graduationPalette)
  } else {
    await drawTextBox(doc, page, res, field, resolveFieldText(field, values), full, input.fonts, values.graduationPalette)
  }

  page.pushOperators(popGraphicsState())
}

async function addCertificatePage(
  doc: PDFDocument,
  res: DocResources,
  shared: SharedResources,
  input: GenerationInput,
  student: Student,
) {
  const { template } = input
  const page = doc.addPage([template.width, template.height])

  const fullPage = { x: 0, y: 0, width: template.width, height: template.height }
  if (res.background?.kind === 'page') page.drawPage(res.background.page, fullPage)
  else if (res.background?.kind === 'image') page.drawImage(res.background.image, fullPage)

  const values: CertificateValues = {
    name: student.name,
    graduation: student.graduation,
    graduationTitle: titleOf(input.graduationSystem, student.graduation),
    graduationPalette: input.graduationSystem?.colors ?? [],
    date: input.date,
    location: input.location,
    signerName: input.signerName,
  }

  // Inverte o eixo Y para trabalhar com a origem no topo, como no editor.
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(1, 0, 0, -1, 0, template.height))
  for (const field of template.fields) {
    await drawField(doc, page, res, shared, field, values, input)
  }
  page.pushOperators(popGraphicsState())
}

/** Dá uma chance para o navegador atualizar a tela entre um certificado e outro. */
const nextFrame = () => new Promise((resolve) => setTimeout(resolve, 0))

export function certificateFileNames(students: Student[]): string[] {
  return uniqueFileNames(
    students.map((s) => sanitizeFileName(s.name)),
    'pdf',
  )
}

/** Gera um PDF por aluno. */
export async function generateCertificates(
  input: GenerationInput,
  onProgress?: ProgressCallback,
): Promise<GeneratedCertificate[]> {
  const shared = await loadShared(input)
  const fileNames = certificateFileNames(input.students)
  const results: GeneratedCertificate[] = []

  for (const [index, student] of input.students.entries()) {
    const doc = await PDFDocument.create()
    doc.setTitle(`Certificado - ${student.name}`)
    doc.setCreator('CertAssign')
    const res = await prepareDoc(doc, shared)
    await addCertificatePage(doc, res, shared, input, student)
    results.push({ student, fileName: fileNames[index], bytes: await doc.save() })
    onProgress?.(index + 1, input.students.length)
    await nextFrame()
  }
  return results
}

/** Gera um único PDF com uma página por aluno (útil para imprimir de uma vez). */
export async function generateCombinedPdf(input: GenerationInput, onProgress?: ProgressCallback): Promise<Uint8Array> {
  const shared = await loadShared(input)
  const doc = await PDFDocument.create()
  doc.setTitle(`Certificados - ${input.template.name}`)
  doc.setCreator('CertAssign')
  const res = await prepareDoc(doc, shared)
  for (const [index, student] of input.students.entries()) {
    await addCertificatePage(doc, res, shared, input, student)
    onProgress?.(index + 1, input.students.length)
    await nextFrame()
  }
  return doc.save()
}
