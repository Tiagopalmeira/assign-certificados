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
import { DEFAULT_GRADUATIONS, normalizeGraduations } from '@/lib/graduations'
import { GRADUATION_COLORS, colorRuns } from '@/lib/colorRuns'

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
    graduationTitle: '',
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

describe('graduações', () => {
  it('a lista é exatamente a especificada, com os títulos', () => {
    expect(DEFAULT_GRADUATIONS.map((g) => g.name)).toEqual([
      'Iniciante', 'Verde', 'Amarelo', 'Azul', 'Verde e Amarelo', 'Verde e Azul', 'Azul e Amarelo',
      'Verde, Amarelo e Azul', 'Branco e Verde', 'Branco e Amarelo', 'Branco e Azul', 'Branco',
    ])
    const titles = Object.fromEntries(DEFAULT_GRADUATIONS.filter((g) => g.title).map((g) => [g.name, g.title]))
    expect(titles).toEqual({
      'Azul e Amarelo': 'Estagiário',
      'Verde, Amarelo e Azul': 'Formado',
      'Branco e Verde': 'Monitor',
      'Branco e Amarelo': 'Professor',
      'Branco e Azul': 'Contramestre',
      Branco: 'Mestre',
    })
  })

  it('lista antiga salva só com nomes ganha os títulos padrão', () => {
    expect(normalizeGraduations(['Verde', 'Branco'])).toEqual([
      { name: 'Verde', title: '' },
      { name: 'Branco', title: 'Mestre' },
    ])
  })

  const values = { name: 'Ana', graduation: 'Branco e Azul', graduationTitle: 'Contramestre', date: '', location: '', signerName: '' }
  const field = createField('graduation', 842, 595)

  it('mostra graduação e título por padrão', () => {
    expect(resolveFieldText(field, values)).toBe('Branco e Azul - Contramestre')
  })
  it('pode mostrar só a graduação ou só o título', () => {
    expect(resolveFieldText({ ...field, graduationDisplay: 'graduation' }, values)).toBe('Branco e Azul')
    expect(resolveFieldText({ ...field, graduationDisplay: 'title' }, values)).toBe('Contramestre')
  })
  it('sem título, mostra a graduação em qualquer opção', () => {
    const verde = { ...values, graduation: 'Verde', graduationTitle: '' }
    expect(resolveFieldText({ ...field, graduationDisplay: 'title' }, verde)).toBe('Verde')
    expect(resolveFieldText(field, verde)).toBe('Verde')
  })
  it('modelos antigos (sem a opção) mostram graduação e título', () => {
    const { graduationDisplay: _ignored, ...old } = field
    expect(resolveFieldText(old, values)).toBe('Branco e Azul - Contramestre')
  })
  it('{titulo} no campo Texto', () => {
    expect(resolveFieldText({ ...createField('text', 842, 595), text: '{graduacao} ({titulo})' }, values)).toBe('Branco e Azul (Contramestre)')
  })
})

describe('colorRuns', () => {
  const mono: FontMetrics = { ascent: 0.8, descent: 0.2, measure: (t, s) => [...t].length * s * 0.5 }
  const field = { ...createField('graduation', 842, 595), style: { ...createField('graduation', 842, 595).style, color: '#000000' } }

  it('pinta cada cor com a própria cor e mantém o resto na cor do campo', () => {
    const runs = colorRuns(field, 'Graduação: Verde e Amarelo', 10, 0, mono)
    expect(runs.map((r) => [r.text, r.color])).toEqual([
      ['Graduação: ', '#000000'],
      ['Verde', GRADUATION_COLORS.verde],
      [' e ', '#000000'],
      ['Amarelo', GRADUATION_COLORS.amarelo],
    ])
  })
  it('o título fica na cor do campo', () => {
    const runs = colorRuns(field, 'Branco - Mestre', 10, 0, mono)
    expect(runs.map((r) => [r.text, r.color])).toEqual([
      ['Branco', GRADUATION_COLORS.branco],
      [' - Mestre', '#000000'],
    ])
  })
  it('calcula a posição de cada trecho com as métricas e o espaçamento', () => {
    const runs = colorRuns(field, 'Verde e Azul', 10, 1, mono)
    // "Verde e " tem 8 caracteres: 8 × 5 de largura + 8 × 1 de espaçamento
    expect(runs.find((r) => r.text === 'Azul')?.offset).toBe(48)
  })
  it('ignora palavras que só contêm a cor e respeita a opção desligada', () => {
    expect(colorRuns(field, 'Azulejo', 10, 0, mono)).toHaveLength(1)
    expect(colorRuns({ ...field, colorizeGraduation: false }, 'Verde', 10, 0, mono)[0].color).toBe('#000000')
    expect(colorRuns(createField('name', 842, 595), 'Verde', 10, 0, mono)[0].color).toBe('#000000')
  })
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
