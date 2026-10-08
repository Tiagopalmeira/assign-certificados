import { createId } from './ids'

/** Palavra que, quando aparece no nome da graduação, é pintada com a cor dela. */
export interface ColorWord {
  word: string
  hex: string
}

export interface GraduationLevel {
  id: string
  name: string
  /** Título que a graduação confere (ex.: "Mestre"). Vazio quando não há. */
  title: string
}

/**
 * Um sistema de graduação: a sequência de níveis de uma modalidade (capoeira, judô,
 * jiu-jitsu…) ou de um grupo/federação específico, com as cores usadas nos nomes.
 */
export interface GraduationSystem {
  id: string
  name: string
  /** Como a graduação é chamada neste sistema: "Faixa", "Corda", "Graduação"… */
  levelLabel: string
  colors: ColorWord[]
  /** Do primeiro (iniciante) ao último nível. */
  levels: GraduationLevel[]
  /** Id do modelo pronto de origem, quando o sistema veio de um. */
  presetId: string | null
  createdAt: string
  updatedAt: string
}

export interface GraduationPreset {
  id: string
  name: string
  levelLabel: string
  colors: ColorWord[]
  levels: { name: string; title?: string }[]
}

/** Cores comuns de faixas e cordas. Os modelos prontos usam só as que precisam. */
const C = {
  branca: '#FFFFFF',
  cinza: '#8A8F98',
  amarela: '#F2C200',
  laranja: '#F07B16',
  verde: '#1B8A3C',
  azul: '#1D4FB8',
  roxa: '#6B2FA3',
  vermelha: '#C8102E',
  marrom: '#6B3E1E',
  preta: '#111111',
  coral: '#E8505B',
}

const words = (entries: [string, string][]): ColorWord[] => entries.map(([word, hex]) => ({ word, hex }))

/** Faixa preta com graus/dans numerados: "Preta 1º Dan", "Preta 2º Dan"… */
const numbered = (prefix: string, suffix: string, from: number, to: number, title = '') =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ name: `${prefix} ${from + i}º ${suffix}`, title }))

/**
 * Listas prontas para começar. São pontos de partida comuns: cada grupo ou federação
 * pode ter variações, e tudo pode ser editado na tela de graduações.
 */
export const GRADUATION_PRESETS: readonly GraduationPreset[] = [
  {
    id: 'capoeira',
    name: 'Capoeira',
    levelLabel: 'Corda',
    colors: words([['Verde', C.verde], ['Amarelo', C.amarela], ['Azul', C.azul], ['Branco', C.branca]]),
    levels: [
      { name: 'Iniciante' },
      { name: 'Verde' },
      { name: 'Amarelo' },
      { name: 'Azul' },
      { name: 'Verde e Amarelo' },
      { name: 'Verde e Azul' },
      { name: 'Azul e Amarelo', title: 'Estagiário' },
      { name: 'Verde, Amarelo e Azul', title: 'Formado' },
      { name: 'Branco e Verde', title: 'Monitor' },
      { name: 'Branco e Amarelo', title: 'Professor' },
      { name: 'Branco e Azul', title: 'Contramestre' },
      { name: 'Branco', title: 'Mestre' },
    ],
  },
  {
    id: 'judo',
    name: 'Judô',
    levelLabel: 'Faixa',
    colors: words([
      ['Branca', C.branca], ['Cinza', C.cinza], ['Azul', C.azul], ['Amarela', C.amarela],
      ['Laranja', C.laranja], ['Verde', C.verde], ['Roxa', C.roxa], ['Marrom', C.marrom],
      ['Preta', C.preta], ['Coral', C.coral], ['Vermelha', C.vermelha],
    ]),
    levels: [
      { name: 'Branca' },
      { name: 'Cinza' },
      { name: 'Azul' },
      { name: 'Amarela' },
      { name: 'Laranja' },
      { name: 'Verde' },
      { name: 'Roxa' },
      { name: 'Marrom' },
      ...numbered('Preta', 'Dan', 1, 5),
      ...numbered('Coral', 'Dan', 6, 8),
      ...numbered('Vermelha', 'Dan', 9, 10),
    ],
  },
  {
    id: 'jiu-jitsu',
    name: 'Jiu-Jitsu (adulto)',
    levelLabel: 'Faixa',
    colors: words([
      ['Branca', C.branca], ['Azul', C.azul], ['Roxa', C.roxa], ['Marrom', C.marrom],
      ['Preta', C.preta], ['Vermelha', C.vermelha],
    ]),
    levels: [
      { name: 'Branca' },
      { name: 'Azul' },
      { name: 'Roxa' },
      { name: 'Marrom' },
      { name: 'Preta', title: 'Professor' },
      ...numbered('Preta', 'grau', 1, 6, 'Professor'),
      { name: 'Vermelha e Preta 7º grau', title: 'Mestre' },
      { name: 'Vermelha e Branca 8º grau', title: 'Mestre' },
      { name: 'Vermelha 9º grau', title: 'Grande Mestre' },
      { name: 'Vermelha 10º grau', title: 'Grande Mestre' },
    ],
  },
  {
    id: 'jiu-jitsu-infantil',
    name: 'Jiu-Jitsu (infantil)',
    levelLabel: 'Faixa',
    colors: words([
      ['Branca', C.branca], ['Cinza', C.cinza], ['Amarela', C.amarela], ['Laranja', C.laranja],
      ['Verde', C.verde], ['Preta', C.preta],
    ]),
    levels: [
      { name: 'Branca' },
      ...['Cinza', 'Amarela', 'Laranja', 'Verde'].flatMap((color) => [
        { name: `${color} e Branca` },
        { name: color },
        { name: `${color} e Preta` },
      ]),
    ],
  },
  {
    id: 'karate',
    name: 'Karatê',
    levelLabel: 'Faixa',
    colors: words([
      ['Branca', C.branca], ['Amarela', C.amarela], ['Vermelha', C.vermelha], ['Laranja', C.laranja],
      ['Verde', C.verde], ['Roxa', C.roxa], ['Marrom', C.marrom], ['Preta', C.preta],
    ]),
    levels: [
      { name: 'Branca' },
      { name: 'Amarela' },
      { name: 'Vermelha' },
      { name: 'Laranja' },
      { name: 'Verde' },
      { name: 'Roxa' },
      { name: 'Marrom' },
      ...numbered('Preta', 'Dan', 1, 5),
    ],
  },
]

/** Cria um sistema novo (com ids próprios) a partir de um modelo pronto. */
export function systemFromPreset(preset: GraduationPreset, now = new Date().toISOString()): GraduationSystem {
  return {
    id: createId(),
    name: preset.name,
    levelLabel: preset.levelLabel,
    colors: preset.colors.map((c) => ({ ...c })),
    levels: preset.levels.map((level) => ({ id: createId(), name: level.name, title: level.title ?? '' })),
    presetId: preset.id,
    createdAt: now,
    updatedAt: now,
  }
}

export function emptySystem(now = new Date().toISOString()): GraduationSystem {
  return {
    id: createId(),
    name: 'Novo sistema',
    levelLabel: 'Faixa',
    colors: [],
    levels: [],
    presetId: null,
    createdAt: now,
    updatedAt: now,
  }
}

/** Texto da graduação com o título, quando houver: "Branco e Azul - Contramestre". */
export function graduationLabel(name: string, title: string): string {
  return title ? `${name} - ${title}` : name
}

export function titleOf(system: GraduationSystem | null | undefined, levelName: string): string {
  return system?.levels.find((level) => level.name === levelName)?.title ?? ''
}

/**
 * Lista antiga (versões anteriores guardavam só a lista da capoeira, às vezes só nomes).
 * Vira um sistema "Capoeira" com as cores e títulos do modelo pronto.
 */
export function systemFromLegacyList(stored: unknown): GraduationSystem | null {
  if (!Array.isArray(stored) || stored.length === 0) return null
  const capoeira = GRADUATION_PRESETS[0]
  const levels = stored
    .map((item) => {
      if (typeof item === 'string') return { name: item.trim(), title: undefined as string | undefined }
      if (item && typeof item === 'object' && typeof (item as { name?: unknown }).name === 'string') {
        const { name, title } = item as { name: string; title?: unknown }
        return { name: name.trim(), title: typeof title === 'string' ? title.trim() : undefined }
      }
      return null
    })
    .filter((level): level is { name: string; title: string | undefined } => Boolean(level?.name))
    .map((level) => ({
      name: level.name,
      title: level.title ?? capoeira.levels.find((l) => l.name === level.name)?.title ?? '',
    }))
  if (levels.length === 0) return null
  return systemFromPreset({ ...capoeira, levels })
}
