import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { BackupError, packBackup, unpackBackup } from '@/lib/backup'
import type { AllData } from '@/lib/db'
import { GRADUATION_PRESETS, systemFromPreset } from '@/lib/graduationSystems'

const now = '2026-10-08T12:00:00.000Z'

function sample(): AllData {
  return {
    templates: [],
    graduationSystems: [systemFromPreset(GRADUATION_PRESETS[0], now)],
    lots: [
      {
        id: 'lote-1',
        createdAt: now,
        templateId: 'modelo-1',
        templateName: 'Diploma',
        systemId: null,
        systemName: 'Capoeira',
        date: '2026-10-08',
        location: 'Araçás - BA',
        signerName: '',
        signatureId: 'arquivo-1',
        groups: [{ id: 'g1', graduation: 'Azul', names: ['Ana', 'Beto'] }],
        count: 2,
      },
    ],
    settings: [{ key: 'graduationSystemsSeeded', value: true }],
    files: [{ id: 'arquivo-1', blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), name: 'assinatura.png', type: 'image/png', createdAt: now }],
    fonts: [
      { id: 'fonte-1', family: 'Minha Fonte', weight: 400, italic: false, source: 'user', fileName: 'minha.ttf', blob: new Blob([new Uint8Array([9, 8])], { type: 'font/ttf' }) },
    ],
  }
}

describe('backup', () => {
  it('volta igual depois de exportar e importar', async () => {
    const bytes = await packBackup(sample(), new Date(now))
    const { data, exportedAt, missing } = await unpackBackup(bytes)
    expect(exportedAt).toBe(now)
    expect(missing).toBe(0)
    expect(data.lots).toEqual(sample().lots)
    expect(data.graduationSystems[0].levels.length).toBe(sample().graduationSystems[0].levels.length)
    expect(data.settings).toEqual([{ key: 'graduationSystemsSeeded', value: true }])
    expect(new Uint8Array(await data.files[0].blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
    expect(data.files[0].type).toBe('image/png')
    expect(new Uint8Array(await data.fonts[0].blob!.arrayBuffer())).toEqual(new Uint8Array([9, 8]))
    expect(data.fonts[0].blob!.type).toBe('font/ttf')
  })

  it('recusa arquivos que não são backup', async () => {
    await expect(unpackBackup(new Uint8Array([1, 2, 3]))).rejects.toBeInstanceOf(BackupError)
    const zip = new JSZip()
    zip.file('outra-coisa.txt', 'oi')
    await expect(unpackBackup(await zip.generateAsync({ type: 'uint8array' }))).rejects.toBeInstanceOf(BackupError)
  })

  it('conta os arquivos que faltam no .zip', async () => {
    const zip = await JSZip.loadAsync(await packBackup(sample()))
    zip.remove('arquivos/arquivo-1')
    const { data, missing } = await unpackBackup(await zip.generateAsync({ type: 'uint8array' }))
    expect(missing).toBe(1)
    expect(data.files).toEqual([])
  })
})
