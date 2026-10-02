declare module 'wawoff2/decompress.js' {
  /** Converte WOFF2 em TTF/OTF. */
  export default function decompress(buffer: Uint8Array): Promise<Uint8Array>
}

declare module 'wawoff2/build/decompress_binding.js?raw' {
  const source: string
  export default source
}
