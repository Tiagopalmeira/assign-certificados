import type { CertificateField, CertificateValues } from '@/types'
import { formatDate } from './dates'

const PLACEHOLDERS: Record<string, (values: CertificateValues, field: CertificateField) => string> = {
  nome: (v) => v.name,
  graduacao: (v) => v.graduation,
  'graduação': (v) => v.graduation,
  data: (v, f) => formatDate(v.date, f.dateFormat),
  local: (v) => v.location,
  assinatura: (v) => v.signerName,
}

export const PLACEHOLDER_HELP = '{nome}, {graduacao}, {data}, {local}, {assinatura}'

function fillPlaceholders(text: string, values: CertificateValues, field: CertificateField): string {
  return text.replace(/\{([^{}]+)\}/g, (match, key: string) => {
    const resolver = PLACEHOLDERS[key.trim().toLowerCase()]
    return resolver ? resolver(values, field) : match
  })
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
      return withAffixes(field, values.graduation)
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
