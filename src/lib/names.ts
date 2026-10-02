/**
 * Converte o texto digitado em uma lista de nomes. Aceita nomes separados por
 * quebra de linha, vírgula ou ponto e vírgula, em qualquer combinação.
 */
export function parseNames(input: string): string[] {
  return input
    .split(/[\r\n,;]+/)
    .map((name) => name.replace(/\s+/g, ' ').trim())
    .filter((name) => name.length > 0)
}
