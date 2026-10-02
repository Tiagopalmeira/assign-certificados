import JSZip from 'jszip'
import type { GeneratedCertificate } from '@/types'

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function pdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' })
}

export async function buildZip(certificates: GeneratedCertificate[]): Promise<Blob> {
  const zip = new JSZip()
  for (const certificate of certificates) zip.file(certificate.fileName, certificate.bytes)
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
}
