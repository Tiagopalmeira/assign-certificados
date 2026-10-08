import type { ColorWord } from '@/lib/graduationSystems'

/** Tipos de campo que podem ser posicionados sobre o modelo. */
export type FieldType = 'name' | 'graduation' | 'date' | 'location' | 'signature' | 'text' | 'image'

export type TextAlign = 'left' | 'center' | 'right'

export type DateFormat = 'short' | 'long'

/** Como o campo "Graduação" aparece: só a graduação, graduação com título ou só o título. */
export type GraduationDisplay = 'graduation' | 'graduation-title' | 'title'

export interface TextStyle {
  fontFamily: string
  fontSize: number
  color: string
  align: TextAlign
  bold: boolean
  italic: boolean
  /** Espaçamento extra entre letras, nas mesmas unidades do modelo. */
  letterSpacing: number
  /** Multiplicador da altura de linha (ex.: 1.2). */
  lineHeight: number
}

/**
 * Campo posicionado no modelo. Coordenadas em pontos (1/72 pol.), origem no canto
 * superior esquerdo da página. A rotação é em graus, sentido horário, em torno do centro.
 */
export interface CertificateField {
  id: string
  type: FieldType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  style: TextStyle
  /** Reduz o tamanho da fonte quando o texto não cabe na caixa. */
  shrinkToFit: boolean
  /** Texto exibido antes/depois do valor (nome, graduação, data, local). */
  prefix: string
  suffix: string
  /** Conteúdo do campo "Texto". Aceita {nome}, {graduacao}, {data}, {local}, {assinatura}. */
  text: string
  dateFormat: DateFormat
  /** Campo "Graduação". Ausente em modelos antigos, que passam a mostrar graduação e título. */
  graduationDisplay?: GraduationDisplay
  /** Campo "Graduação": pinta cada cor (Verde, Amarelo…) com a própria cor. Padrão: sim. */
  colorizeGraduation?: boolean
  /** Imagem fixa do campo "Imagem". */
  imageId: string | null
  /** Campo "Assinatura": exibe o nome de quem assina abaixo da imagem. */
  showSignerName: boolean
}

export interface TemplateDefaults {
  /** Data no formato ISO (AAAA-MM-DD). */
  date: string
  location: string
  signerName: string
  signatureImageId: string | null
}

export interface TemplateSource {
  kind: 'pdf' | 'image'
  fileId: string
  mimeType: string
  fileName: string
}

export interface CertificateTemplate {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  source: TemplateSource
  /** Imagem PNG/JPG usada como fundo no editor e nas prévias. */
  backgroundId: string
  /** Tamanho da página em pontos. */
  width: number
  height: number
  fields: CertificateField[]
  defaults: TemplateDefaults
}

export interface StoredFile {
  id: string
  blob: Blob
  name: string
  type: string
  createdAt: string
}

export interface FontVariant {
  id: string
  family: string
  weight: 400 | 700
  italic: boolean
  source: 'builtin' | 'user'
  fileName: string
  /** Fontes embutidas são carregadas por URL; as enviadas pelo usuário ficam no banco. */
  url?: string
  blob?: Blob
  createdAt?: string
}

export interface Student {
  name: string
  graduation: string
}

export interface StudentGroup {
  id: string
  graduation: string
  names: string[]
}

/** Valores usados para preencher um certificado. */
export interface CertificateValues {
  name: string
  graduation: string
  /** Título da graduação (ex.: "Mestre"); vazio quando não há. */
  graduationTitle: string
  /** Cores do sistema de graduação, usadas para pintar o nome da graduação. */
  graduationPalette: ColorWord[]
  date: string
  location: string
  signerName: string
}

/** Lote pronto para geração (formato descrito na especificação). */
export interface CertificateBatch {
  templateId: string
  date: string
  location: string
  signerName: string
  /** Imagem de assinatura do lote: a do modelo, uma nova enviada ou nenhuma. */
  signatureId: string | null
  students: Student[]
}

export interface GeneratedCertificate {
  student: Student
  fileName: string
  bytes: Uint8Array
}
