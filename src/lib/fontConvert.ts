/**
 * Conversão de fontes web (WOFF/WOFF2) para TTF/OTF. Leitores de PDF só entendem fontes
 * TrueType/OpenType "cruas", então toda fonte passa por aqui antes de ir para o PDF.
 */

export type FontFormat = 'woff' | 'woff2' | 'sfnt' | 'unknown'

export function fontFormat(bytes: Uint8Array): FontFormat {
  if (bytes.length < 4) return 'unknown'
  const signature = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
  if (signature === 'wOFF') return 'woff'
  if (signature === 'wOF2') return 'woff2'
  // TrueType (0x00010000), 'true', OpenType/CFF ('OTTO') e coleções ('ttcf')
  if (signature === '\0\x01\0\0' || signature === 'true' || signature === 'OTTO' || signature === 'ttcf') return 'sfnt'
  return 'unknown'
}

async function inflateZlib(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data.slice().buffer as ArrayBuffer]).stream().pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** WOFF 1.0 é só um "embrulho" com tabelas comprimidas por zlib: basta desembrulhar. */
async function woffToSfnt(bytes: Uint8Array): Promise<Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const flavor = view.getUint32(4)
  const numTables = view.getUint16(12)

  const tables: { tag: number; checksum: number; data: Uint8Array }[] = []
  for (let i = 0; i < numTables; i++) {
    const entry = 44 + i * 20
    const tag = view.getUint32(entry)
    const offset = view.getUint32(entry + 4)
    const compLength = view.getUint32(entry + 8)
    const origLength = view.getUint32(entry + 12)
    const checksum = view.getUint32(entry + 16)
    const raw = bytes.subarray(offset, offset + compLength)
    const data = compLength < origLength ? await inflateZlib(raw) : raw
    if (data.length !== origLength) throw new Error('Arquivo WOFF inválido.')
    tables.push({ tag, checksum, data })
  }
  tables.sort((a, b) => a.tag - b.tag)

  const headerSize = 12 + numTables * 16
  const totalSize = tables.reduce((size, t) => size + Math.ceil(t.data.length / 4) * 4, headerSize)
  const out = new Uint8Array(totalSize)
  const outView = new DataView(out.buffer)
  const entrySelector = Math.floor(Math.log2(numTables))
  const searchRange = 2 ** entrySelector * 16
  outView.setUint32(0, flavor)
  outView.setUint16(4, numTables)
  outView.setUint16(6, searchRange)
  outView.setUint16(8, entrySelector)
  outView.setUint16(10, numTables * 16 - searchRange)

  let offset = headerSize
  tables.forEach((table, i) => {
    const record = 12 + i * 16
    outView.setUint32(record, table.tag)
    outView.setUint32(record + 4, table.checksum)
    outView.setUint32(record + 8, offset)
    outView.setUint32(record + 12, table.data.length)
    out.set(table.data, offset)
    offset += Math.ceil(table.data.length / 4) * 4
  })
  return out
}

interface Woff2Module {
  decompress(buffer: Uint8Array): Uint8Array | false
  calledRun?: boolean
  onRuntimeInitialized?: () => void
  onAbort?: (reason: unknown) => void
}

let browserDecoder: Promise<Woff2Module> | null = null

/**
 * O pacote wawoff2 só exporta o módulo quando roda no Node. No navegador, executamos o
 * código compilado (Emscripten) como o script clássico que ele é e pegamos o "Module" criado.
 */
function loadBrowserDecoder(): Promise<Woff2Module> {
  browserDecoder ??= import('wawoff2/build/decompress_binding.js?raw').then(
    ({ default: source }) =>
      new Promise<Woff2Module>((resolve, reject) => {
        const factory = new Function('module', 'require', 'process', `${source}
return Module`)
        const decoder = factory(undefined, undefined, undefined) as Woff2Module
        decoder.onAbort = reject
        if (decoder.calledRun) resolve(decoder)
        else decoder.onRuntimeInitialized = () => resolve(decoder)
      }),
  )
  browserDecoder.catch(() => (browserDecoder = null))
  return browserDecoder
}

/** WOFF2 reorganiza as tabelas de glifos; usamos o decodificador oficial do Google (WebAssembly). */
async function woff2ToSfnt(bytes: Uint8Array): Promise<Uint8Array> {
  let result: Uint8Array | false
  if (typeof window === 'undefined') {
    const { default: decompress } = await import('wawoff2/decompress.js')
    result = await decompress(bytes)
  } else {
    result = (await loadBrowserDecoder()).decompress(bytes)
  }
  if (!result) throw new Error('Não foi possível converter a fonte WOFF2. Tente enviar o arquivo em TTF ou OTF.')
  return new Uint8Array(result)
}

/** Devolve a fonte como TTF/OTF, convertendo WOFF e WOFF2 quando preciso. */
export async function toSfnt(bytes: Uint8Array): Promise<Uint8Array> {
  switch (fontFormat(bytes)) {
    case 'sfnt':
      return bytes
    case 'woff':
      return woffToSfnt(bytes)
    case 'woff2':
      return woff2ToSfnt(bytes)
    default:
      throw new Error('Arquivo de fonte não reconhecido. Envie um TTF, OTF, WOFF ou WOFF2.')
  }
}
