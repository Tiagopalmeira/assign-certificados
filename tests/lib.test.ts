import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fontFormat, toSfnt } from '@/lib/fontConvert'
import { fontkit } from '@/lib/fontkit'
import { parseNames } from '@/lib/names'
import { sanitizeFileName, uniqueFileNames } from '@/lib/filename'
import { formatDate } from '@/lib/dates'
import { resolveFieldText } from '@/lib/fieldText'
import { createField } from '@/lib/fields'
import { layoutText, type FontMetrics } from '@/lib/textLayout'
import { resolveFont, BUILTIN_FONTS, metricsFromFont } from '@/lib/fonts'
import { DEFAULT_GRADUATIONS } from '@/lib/graduations'

describe('parseNames', () => {
  const expected = ['João da Silva', 'Maria Santos', 'Pedro Souza']

  it('aceita quebra de linha', () => {
    expect(parseNames('João da Silva\nMaria Santos\r\nPedro Souza')).toEqual(expected)
  })
  it('aceita vírgula', () => {
    expect(parseNames('João da Silva, Maria Santos, Pedro Souza')).toEqual(expected)
  })
  it('aceita ponto e vírgula', () => {
    expect(parseNames('João da Silva; Maria Santos; Pedro Souza')).toEqual(expected)
  })
  it('aceita separadores misturados e ignora vazios e espaços extras', () => {
    expect(parseNames('  João   da Silva ;\n\n Maria Santos,,Pedro Souza;')).toEqual(expected)
  })
})

describe('sanitizeFileName', () => {
  it('remove acentos e troca espaços por _', () => {
    expect(sanitizeFileName('João da Silva')).toBe('Joao_da_Silva')
  })
  it('remove caracteres inválidos', () => {
    expect(sanitizeFileName('Ana/Paula: "Lima"?*')).toBe('Ana_Paula_Lima')
  })
  it('usa um nome padrão quando nada sobra', () => {
    expect(sanitizeFileName('???')).toBe('certificado')
  })
  it('evita nomes repetidos', () => {
    expect(uniqueFileNames(['Joao', 'joao', 'Maria', 'Joao'], 'pdf')).toEqual([
      'Joao.pdf',
      'joao_2.pdf',
      'Maria.pdf',
      'Joao_3.pdf',
    ])
  })
})

describe('formatDate', () => {
  it('formata curto e por extenso', () => {
    expect(formatDate('2026-10-02')).toBe('02/10/2026')
    expect(formatDate('2026-10-02', 'long')).toBe('2 de outubro de 2026')
  })
  it('devolve vazio para datas inválidas', () => {
    expect(formatDate('')).toBe('')
  })
})

describe('resolveFieldText', () => {
  const values = {
    name: 'João da Silva',
    graduation: 'Verde',
    date: '2026-10-02',
    location: 'Araçás - BA',
    signerName: 'Mestre Fulano',
  }

  it('aplica prefixo e sufixo', () => {
    const field = { ...createField('graduation', 842, 595), prefix: 'Graduação: ', suffix: '.' }
    expect(resolveFieldText(field, values)).toBe('Graduação: Verde.')
  })
  it('preenche variáveis do texto livre', () => {
    const field = { ...createField('text', 842, 595), text: '{nome} - {GRADUACAO} - {data} - {local} - {outra}' }
    expect(resolveFieldText(field, values)).toBe('João da Silva - Verde - 02/10/2026 - Araçás - BA - {outra}')
  })
})

describe('layoutText', () => {
  // Fonte monoespaçada fictícia: cada caractere mede 0,5 em.
  const mono: FontMetrics = { ascent: 0.8, descent: 0.2, measure: (t, s) => [...t].length * s * 0.5 }
  const base = {
    width: 100,
    height: 20,
    fontSize: 10,
    letterSpacing: 0,
    lineHeight: 1.2,
    align: 'center' as const,
    multiline: false,
    shrinkToFit: true,
  }

  it('centraliza uma linha', () => {
    const layout = layoutText({ ...base, text: 'abcd' }, mono)
    expect(layout.fontSize).toBe(10)
    expect(layout.lines[0].x).toBe(40)
  })
  it('reduz a fonte para caber na largura', () => {
    const layout = layoutText({ ...base, text: 'a'.repeat(40) }, mono)
    expect(layout.fontSize).toBeLessThan(10)
    expect(layout.lines[0].width).toBeLessThanOrEqual(100)
  })
  it('quebra linhas no modo multilinha', () => {
    const layout = layoutText({ ...base, height: 100, multiline: true, shrinkToFit: false, text: 'aaaa bbbb cccc dddd eeee' }, mono)
    expect(layout.lines.map((l) => l.text)).toEqual(['aaaa bbbb cccc dddd', 'eeee'])
  })
})

describe('resolveFont', () => {
  it('escolhe a variante exata quando existe', () => {
    const r = resolveFont(BUILTIN_FONTS, 'Inter', true, true)
    expect(r.variant.id).toBe('builtin-inter-700i')
    expect(r.fauxBold || r.fauxItalic).toBe(false)
  })
  it('simula negrito quando a família não tem', () => {
    const r = resolveFont(BUILTIN_FONTS, 'Great Vibes', true, false)
    expect(r.variant.family).toBe('Great Vibes')
    expect(r.fauxBold).toBe(true)
  })
  it('usa Inter quando a família foi removida', () => {
    expect(resolveFont(BUILTIN_FONTS, 'Não existe', false, false).variant.family).toBe('Inter')
  })
})

it('a lista de graduações é exatamente a especificada', () => {
  expect(DEFAULT_GRADUATIONS).toEqual([
    'Iniciante', 'Verde', 'Amarelo', 'Azul', 'Verde e Amarelo', 'Verde e Azul', 'Azul e Amarelo',
    'Verde, Amarelo e Azul', 'Branco e Verde', 'Branco e Amarelo', 'Branco e Azul', 'Branco',
  ])
})

describe('toSfnt', () => {
  const read = (file: string) => new Uint8Array(readFileSync(`node_modules/@fontsource/inter/files/${file}`))

  it('converte WOFF e WOFF2 em TTF que o fontkit lê com as mesmas métricas', async () => {
    const fromWoff = await toSfnt(read('inter-latin-400-normal.woff'))
    const fromWoff2 = await toSfnt(read('inter-latin-400-normal.woff2'))
    expect(fontFormat(fromWoff)).toBe('sfnt')
    expect(fontFormat(fromWoff2)).toBe('sfnt')
    const original = metricsFromFont(fontkit.create(read('inter-latin-400-normal.woff')))
    for (const converted of [fromWoff, fromWoff2]) {
      const metrics = metricsFromFont(fontkit.create(converted))
      expect(metrics.measure('João da Silva', 20)).toBeCloseTo(original.measure('João da Silva', 20), 5)
    }
  })

  it('recusa arquivos que não são fontes', async () => {
    await expect(toSfnt(new Uint8Array([1, 2, 3, 4, 5]))).rejects.toThrow()
  })
})
