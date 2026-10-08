/**
 * Converte o texto digitado em uma lista de nomes. Aceita nomes separados por
 * quebra de linha, vírgula ou ponto e vírgula, em qualquer combinação. Remove pontos finais.
 */
export function parseNames(input: string): string[] {
  return input
    .split(/[\r\n,;]+/)
    // Pontos no fim (ex.: "Maria Santos.") costumam ser digitados sem querer.
    .map((name) => name.replace(/\s+/g, ' ').replace(/[\s.…]+$/u, '').trim())
    .filter((name) => name.length > 0)
}
