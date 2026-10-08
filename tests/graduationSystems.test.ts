import { describe, expect, it } from 'vitest'
import {
  GRADUATION_PRESETS,
  graduationLabel,
  systemFromLegacyList,
  systemFromPreset,
  titleOf,
} from '@/lib/graduationSystems'

describe('modelos prontos de graduação', () => {
  it('têm Capoeira, Judô, Jiu-Jitsu (adulto e infantil) e Karatê', () => {
    expect(GRADUATION_PRESETS.map((p) => p.name)).toEqual([
      'Capoeira',
      'Judô',
      'Jiu-Jitsu (adulto)',
      'Jiu-Jitsu (infantil)',
      'Karatê',
    ])
  })

  for (const preset of GRADUATION_PRESETS) {
    it(`${preset.name}: níveis sem repetição e cores válidas`, () => {
      const names = preset.levels.map((l) => l.name)
      expect(new Set(names).size).toBe(names.length)
      for (const color of preset.colors) expect(color.hex).toMatch(/^#[0-9A-F]{6}$/)
    })
  }

  it('capoeira mantém a lista e os títulos combinados', () => {
    const capoeira = GRADUATION_PRESETS.find((p) => p.id === 'capoeira')!
    expect(capoeira.levels.map((l) => l.name)).toEqual([
      'Iniciante', 'Verde', 'Amarelo', 'Azul', 'Verde e Amarelo', 'Verde e Azul', 'Azul e Amarelo',
      'Verde, Amarelo e Azul', 'Branco e Verde', 'Branco e Amarelo', 'Branco e Azul', 'Branco',
    ])
    expect(Object.fromEntries(capoeira.levels.filter((l) => l.title).map((l) => [l.name, l.title]))).toEqual({
      'Azul e Amarelo': 'Estagiário',
      'Verde, Amarelo e Azul': 'Formado',
      'Branco e Verde': 'Monitor',
      'Branco e Amarelo': 'Professor',
      'Branco e Azul': 'Contramestre',
      Branco: 'Mestre',
    })
  })
})

describe('sistemas', () => {
  it('criados de um modelo pronto ganham ids próprios', () => {
    const a = systemFromPreset(GRADUATION_PRESETS[1])
    const b = systemFromPreset(GRADUATION_PRESETS[1])
    expect(a.id).not.toBe(b.id)
    expect(a.levels[0].id).not.toBe(b.levels[0].id)
    expect(a.presetId).toBe('judo')
  })

  it('título e rótulo da graduação', () => {
    const capoeira = systemFromPreset(GRADUATION_PRESETS[0])
    expect(titleOf(capoeira, 'Branco')).toBe('Mestre')
    expect(titleOf(capoeira, 'Verde')).toBe('')
    expect(titleOf(null, 'Branco')).toBe('')
    expect(graduationLabel('Branco', 'Mestre')).toBe('Branco - Mestre')
    expect(graduationLabel('Verde', '')).toBe('Verde')
  })

  it('lista antiga salva só com nomes vira um sistema Capoeira com títulos e cores', () => {
    const system = systemFromLegacyList(['Verde', 'Branco'])!
    expect(system.name).toBe('Capoeira')
    expect(system.levels.map((l) => [l.name, l.title])).toEqual([
      ['Verde', ''],
      ['Branco', 'Mestre'],
    ])
    expect(system.colors.map((c) => c.word)).toContain('Branco')
    expect(systemFromLegacyList([])).toBeNull()
    expect(systemFromLegacyList('x')).toBeNull()
  })
})
