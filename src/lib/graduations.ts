export interface Graduation {
  name: string
  /** Título que a graduação confere (ex.: "Mestre"). Vazio quando não há. */
  title: string
}

/** Lista inicial de graduações. Fica salva no banco para poder ser editada no futuro. */
export const DEFAULT_GRADUATIONS: readonly Graduation[] = [
  { name: 'Iniciante', title: '' },
  { name: 'Verde', title: '' },
  { name: 'Amarelo', title: '' },
  { name: 'Azul', title: '' },
  { name: 'Verde e Amarelo', title: '' },
  { name: 'Verde e Azul', title: '' },
  { name: 'Azul e Amarelo', title: 'Estagiário' },
  { name: 'Verde, Amarelo e Azul', title: 'Formado' },
  { name: 'Branco e Verde', title: 'Monitor' },
  { name: 'Branco e Amarelo', title: 'Professor' },
  { name: 'Branco e Azul', title: 'Contramestre' },
  { name: 'Branco', title: 'Mestre' },
]

/** Texto da graduação com o título, quando houver: "Branco e Azul - Contramestre". */
export function graduationLabel(name: string, title: string): string {
  return title ? `${name} - ${title}` : name
}

/**
 * Converte o que estiver salvo no banco para a lista com títulos. Versões anteriores
 * guardavam só os nomes; nesse caso os títulos vêm da lista padrão.
 */
export function normalizeGraduations(stored: unknown): Graduation[] | null {
  if (!Array.isArray(stored) || stored.length === 0) return null
  return stored
    .map((item): Graduation | null => {
      if (typeof item === 'string') {
        const name = item.trim()
        return { name, title: DEFAULT_GRADUATIONS.find((g) => g.name === name)?.title ?? '' }
      }
      if (item && typeof item === 'object' && typeof (item as Graduation).name === 'string') {
        const { name, title } = item as Graduation
        return { name: name.trim(), title: typeof title === 'string' ? title.trim() : '' }
      }
      return null
    })
    .filter((g): g is Graduation => Boolean(g?.name))
}
