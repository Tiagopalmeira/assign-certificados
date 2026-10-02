import type { DateFormat } from '@/types'

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

function parseIsoDate(iso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const [, year, month, day] = match
  return { year: Number(year), month: Number(month), day: Number(day) }
}

/** Formata uma data ISO (AAAA-MM-DD) como "02/10/2026" ou "2 de outubro de 2026". */
export function formatDate(iso: string, format: DateFormat = 'short'): string {
  const parts = parseIsoDate(iso)
  if (!parts) return ''
  const { year, month, day } = parts
  if (format === 'long') return `${day} de ${MONTHS[month - 1]} de ${year}`
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
}

export function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Data e hora para listas (ex.: "02/10/2026 às 14:30"). */
export function formatDateTime(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} às ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
