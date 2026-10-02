const MAX_LENGTH = 80

/** Gera um nome de arquivo seguro: sem acentos, sem caracteres inválidos, espaços viram "_". */
export function sanitizeFileName(value: string, fallback = 'certificado'): string {
  const clean = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/[_-]+$/g, '')
  return clean || fallback
}

/** Garante nomes únicos acrescentando _2, _3… quando há repetição (sem diferenciar maiúsculas). */
export function uniqueFileNames(baseNames: string[], extension: string): string[] {
  const used = new Set<string>()
  return baseNames.map((base) => {
    let candidate = base
    let counter = 2
    while (used.has(candidate.toLowerCase())) {
      candidate = `${base}_${counter}`
      counter++
    }
    used.add(candidate.toLowerCase())
    return `${candidate}.${extension}`
  })
}
