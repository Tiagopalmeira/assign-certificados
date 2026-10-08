import JSZip from 'jszip'
import type { FontVariant, StoredFile } from '@/types'
import type { AllData } from './db'

/**
 * Backup: um .zip com um backup.json (modelos, sistemas, lotes, configurações e os dados de
 * cada arquivo e fonte) e o conteúdo de cada arquivo e fonte em pastas próprias.
 */
const FORMAT = 'cert-assign-backup'
const VERSION = 1
const MANIFEST = 'backup.json'
const FILES_DIR = 'arquivos'
const FONTS_DIR = 'fontes'

type FileInfo = Omit<StoredFile, 'blob'>
/** blobType: tipo da fonte enviada; ausente nas fontes sem arquivo próprio. */
type FontInfo = Omit<FontVariant, 'blob'> & { blobType?: string }

interface Manifest {
  format: typeof FORMAT
  version: number
  exportedAt: string
  templates: AllData['templates']
  graduationSystems: AllData['graduationSystems']
  lots: AllData['lots']
  settings: AllData['settings']
  files: FileInfo[]
  fonts: FontInfo[]
}

export class BackupError extends Error {}

export async function packBackup(data: AllData, now = new Date()): Promise<Uint8Array> {
  const zip = new JSZip()
  const manifest: Manifest = {
    format: FORMAT,
    version: VERSION,
    exportedAt: now.toISOString(),
    templates: data.templates,
    graduationSystems: data.graduationSystems,
    lots: data.lots,
    settings: data.settings,
    files: data.files.map(({ blob: _blob, ...info }) => info),
    fonts: data.fonts.map(({ blob, ...info }) => (blob ? { ...info, blobType: blob.type } : info)),
  }
  zip.file(MANIFEST, JSON.stringify(manifest))
  for (const file of data.files) zip.file(`${FILES_DIR}/${file.id}`, await file.blob.arrayBuffer())
  for (const font of data.fonts) if (font.blob) zip.file(`${FONTS_DIR}/${font.id}`, await font.blob.arrayBuffer())
  // Imagens e fontes já vêm comprimidas; o ganho do DEFLATE nelas não compensa o tempo.
  return zip.generateAsync({ type: 'uint8array', compression: 'STORE' })
}

function isManifest(value: unknown): value is Manifest {
  if (!value || typeof value !== 'object') return false
  const m = value as Partial<Manifest>
  return (
    m.format === FORMAT &&
    typeof m.version === 'number' &&
    [m.templates, m.graduationSystems, m.lots, m.settings, m.files, m.fonts].every(Array.isArray)
  )
}

export interface UnpackedBackup {
  data: AllData
  exportedAt: string
  /** Arquivos citados no backup que não estavam no .zip. */
  missing: number
}

export async function unpackBackup(bytes: ArrayBuffer | Uint8Array): Promise<UnpackedBackup> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(bytes)
  } catch {
    throw new BackupError('Este arquivo não é um backup do CertAssign.')
  }
  const manifestFile = zip.file(MANIFEST)
  if (!manifestFile) throw new BackupError('Este arquivo não é um backup do CertAssign.')
  let manifest: unknown
  try {
    manifest = JSON.parse(await manifestFile.async('string'))
  } catch {
    throw new BackupError('O backup está danificado.')
  }
  if (!isManifest(manifest)) throw new BackupError('Este arquivo não é um backup do CertAssign.')
  if (manifest.version > VERSION) {
    throw new BackupError('Este backup foi feito por uma versão mais nova do CertAssign. Atualize a página e tente de novo.')
  }

  let missing = 0
  const read = async (path: string, type: string) => {
    const entry = zip.file(path)
    if (!entry) return null
    return new Blob([await entry.async('arraybuffer')], { type })
  }

  const files: StoredFile[] = []
  for (const info of manifest.files) {
    const blob = await read(`${FILES_DIR}/${info.id}`, info.type)
    if (blob) files.push({ ...info, blob })
    else missing++
  }

  const fonts: FontVariant[] = []
  for (const { blobType, ...info } of manifest.fonts) {
    if (blobType === undefined) {
      fonts.push(info)
      continue
    }
    const blob = await read(`${FONTS_DIR}/${info.id}`, blobType)
    if (blob) fonts.push({ ...info, blob })
    else missing++
  }

  return {
    data: {
      templates: manifest.templates,
      graduationSystems: manifest.graduationSystems,
      lots: manifest.lots,
      settings: manifest.settings,
      files,
      fonts,
    },
    exportedAt: manifest.exportedAt,
    missing,
  }
}
