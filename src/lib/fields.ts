import type { CertificateField, CertificateValues, FieldType, TemplateDefaults } from '@/types'
import { createId } from './ids'

export const DEFAULT_FONT_FAMILY = 'Inter'

export interface FieldTypeInfo {
  type: FieldType
  label: string
  description: string
}

export const FIELD_TYPES: readonly FieldTypeInfo[] = [
  { type: 'name', label: 'Nome', description: 'Nome do aluno, muda em cada certificado' },
  { type: 'graduation', label: 'Graduação', description: 'Graduação do aluno, escolhida na lista' },
  { type: 'date', label: 'Data', description: 'Data do evento' },
  { type: 'location', label: 'Local', description: 'Cidade ou local do evento' },
  { type: 'signature', label: 'Assinatura', description: 'Imagem da assinatura e nome de quem assina' },
  { type: 'text', label: 'Texto', description: 'Texto livre, pode incluir dados do aluno' },
  { type: 'image', label: 'Imagem', description: 'Logo ou outra imagem fixa' },
]

export function fieldLabel(type: FieldType): string {
  return FIELD_TYPES.find((info) => info.type === type)?.label ?? type
}

/** Valores de exemplo usados no editor e nas miniaturas. */
export function sampleValues(defaults: TemplateDefaults): CertificateValues {
  return {
    name: 'Maria Oliveira Santos',
    graduation: 'Verde e Amarelo',
    date: defaults.date,
    location: defaults.location,
    signerName: defaults.signerName,
  }
}

/** Cria um campo novo, centralizado e com tamanho proporcional à página. */
export function createField(type: FieldType, pageWidth: number, pageHeight: number): CertificateField {
  const unit = pageWidth / 100
  const sizes: Record<FieldType, { w: number; h: number; font: number; bold: boolean }> = {
    name: { w: 60, h: 8, font: 4.2, bold: true },
    graduation: { w: 30, h: 5, font: 2.4, bold: false },
    date: { w: 22, h: 4, font: 1.9, bold: false },
    location: { w: 26, h: 4, font: 1.9, bold: false },
    signature: { w: 24, h: 10, font: 1.6, bold: false },
    text: { w: 60, h: 10, font: 2, bold: false },
    image: { w: 14, h: 14, font: 2, bold: false },
  }
  const size = sizes[type]
  const width = size.w * unit
  const height = size.h * unit
  return {
    id: createId(),
    type,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
    rotation: 0,
    style: {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: Math.round(size.font * unit),
      color: '#000000',
      align: 'center',
      bold: size.bold,
      italic: false,
      letterSpacing: 0,
      lineHeight: 1.25,
    },
    shrinkToFit: type !== 'text',
    prefix: '',
    suffix: '',
    text: type === 'text' ? 'Certificamos que {nome} recebeu a graduação {graduacao}.' : '',
    dateFormat: 'short',
    imageId: null,
    showSignerName: true,
  }
}

export function cloneField(field: CertificateField, offset: number): CertificateField {
  return {
    ...structuredClone(field),
    id: createId(),
    x: field.x + offset,
    y: field.y + offset,
  }
}
