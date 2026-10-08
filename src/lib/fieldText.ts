import type { CertificateField, CertificateTemplate, CertificateValues } from '@/types'
import { formatDate } from './dates'
import { graduationLabel } from './graduationSystems'

const PLACEHOLDERS: Record<string, (values: CertificateValues, field: CertificateField) => string> = {
  nome: (v) => v.name,
  graduacao: (v) => v.graduation,
  'graduação': (v) => v.graduation,
  titulo: (v) => v.graduationTitle,
  'título': (v) => v.graduationTitle,
  graduacao_anterior: (v) => v.previousGraduation,
  'graduação_anterior': (v) => v.previousGraduation,
  data: (v, f) => formatDate(v.date, f.dateFormat),
  local: (v) => v.location,
  assinatura: (v) => v.signerName,
}

export const PLACEHOLDER_HELP = '{nome}, {graduacao}, {graduacao_anterior}, {titulo}, {data}, {local}, {assinatura}'

function fillPlaceholders(text: string, values: CertificateValues, field: CertificateField): string {
  return text.replace(/\{([^{}]+)\}/g, (match, key: string) => {
    const resolver = PLACEHOLDERS[key.trim().toLowerCase()]
    return resolver ? resolver(values, field) : match
  })
}

/** Graduação como o campo pede. Sem título, mostra a graduação em qualquer opção. */
function levelText(field: CertificateField, name: string, title: string): string {
  const display = field.graduationDisplay ?? 'graduation-title'
  if (display === 'graduation' || !title) return name
  if (display === 'title') return title
  return graduationLabel(name, title)
}

export function graduationText(field: CertificateField, values: CertificateValues): string {
  return levelText(field, values.graduation, values.graduationTitle)
}

export function previousGraduationText(field: CertificateField, values: CertificateValues): string {
  return levelText(field, values.previousGraduation, values.previousGraduationTitle)
}

function withAffixes(field: CertificateField, value: string): string {
  if (!value) return ''
  return `${field.prefix}${value}${field.suffix}`
}

/**
 * Texto final de um campo para um certificado. Para o campo "Assinatura",
 * devolve a legenda (nome de quem assina) ou vazio quando ela está oculta.
 */
export function resolveFieldText(field: CertificateField, values: CertificateValues): string {
  switch (field.type) {
    case 'name':
      return withAffixes(field, values.name)
    case 'graduation':
      return withAffixes(field, graduationText(field, values))
    case 'previous-graduation':
      return withAffixes(field, previousGraduationText(field, values))
    case 'date':
      return withAffixes(field, formatDate(values.date, field.dateFormat))
    case 'location':
      return withAffixes(field, values.location)
    case 'text':
      return fillPlaceholders(field.text, values, field)
    case 'signature':
      return field.showSignerName ? values.signerName : ''
    case 'image':
      return ''
  }
}

/** Só o campo "Texto" quebra em várias linhas; os demais ficam numa linha. */
export function isMultiline(field: CertificateField): boolean {
  return field.type === 'text'
}

export function hasText(field: CertificateField): boolean {
  return field.type !== 'image'
}

/** O modelo mostra a graduação anterior (no campo próprio ou no texto)? */
export function usesPreviousGraduation(template: Pick<CertificateTemplate, 'fields'>): boolean {
  return template.fields.some(
    (field) =>
      field.type === 'previous-graduation' ||
      (field.type === 'text' && /\{\s*gradua(c|ç)(a|ã)o_anterior\s*\}/i.test(field.text)),
  )
}
