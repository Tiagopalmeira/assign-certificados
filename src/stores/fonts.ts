import { defineStore } from 'pinia'
import { computed, ref, shallowReactive } from 'vue'
import type { FontVariant } from '@/types'
import { fontsRepo } from '@/lib/db'
import {
  BUILTIN_FONTS,
  cssFamilyFor,
  forgetFont,
  loadFontBytes,
  loadFontkitFont,
  metricsFromFont,
  resolveFont,
  type ResolvedFont,
} from '@/lib/fonts'
import type { FontMetrics } from '@/lib/textLayout'
import { createId } from '@/lib/ids'
import { toSfnt } from '@/lib/fontConvert'

export interface FontFamily {
  name: string
  source: 'builtin' | 'user'
  variants: FontVariant[]
}

export interface RenderFont extends ResolvedFont {
  cssFamily: string
  /** null enquanto a fonte ainda está carregando. */
  metrics: FontMetrics | null
}

export const useFontsStore = defineStore('fonts', () => {
  const userFonts = ref<FontVariant[]>([])
  const ready = ref(false)
  const metrics = shallowReactive(new Map<string, FontMetrics>())
  const loading = new Set<string>()

  const variants = computed<FontVariant[]>(() => [...BUILTIN_FONTS, ...userFonts.value])

  const families = computed<FontFamily[]>(() => {
    const map = new Map<string, FontFamily>()
    for (const variant of variants.value) {
      const family = map.get(variant.family) ?? { name: variant.family, source: variant.source, variants: [] }
      family.variants.push(variant)
      map.set(variant.family, family)
    }
    return [...map.values()]
  })

  async function init() {
    if (ready.value) return
    userFonts.value = await fontsRepo.list()
    ready.value = true
  }

  /** Registra a fonte no navegador (para o SVG) e guarda as métricas (para o layout). */
  async function ensureLoaded(variant: FontVariant) {
    if (metrics.has(variant.id) || loading.has(variant.id)) return
    loading.add(variant.id)
    try {
      const [bytes, font] = await Promise.all([loadFontBytes(variant), loadFontkitFont(variant)])
      const face = new FontFace(cssFamilyFor(variant), bytes.slice().buffer as ArrayBuffer)
      await face.load()
      document.fonts.add(face)
      metrics.set(variant.id, metricsFromFont(font))
    } catch (error) {
      console.error(`Falha ao carregar a fonte ${variant.family}`, error)
    } finally {
      loading.delete(variant.id)
    }
  }

  function renderFont(family: string, bold: boolean, italic: boolean): RenderFont {
    const resolved = resolveFont(variants.value, family, bold, italic)
    const loaded = metrics.get(resolved.variant.id) ?? null
    if (!loaded) void ensureLoaded(resolved.variant)
    return { ...resolved, cssFamily: cssFamilyFor(resolved.variant), metrics: loaded }
  }

  async function addFont(file: File, family: string, weight: 400 | 700, italic: boolean) {
    // Guarda já em TTF/OTF: a conversão de WOFF2 é pesada e assim acontece uma vez só.
    const sfnt = await toSfnt(new Uint8Array(await file.arrayBuffer()))
    const variant: FontVariant = {
      id: createId(),
      family: family.trim(),
      weight,
      italic,
      source: 'user',
      fileName: file.name,
      blob: new Blob([sfnt.slice().buffer as ArrayBuffer], { type: 'font/sfnt' }),
      createdAt: new Date().toISOString(),
    }
    await fontsRepo.put(variant)
    userFonts.value = [...userFonts.value, variant]
    return variant
  }

  async function removeFamily(name: string) {
    const toRemove = userFonts.value.filter((font) => font.family === name)
    for (const font of toRemove) {
      await fontsRepo.remove(font.id)
      forgetFont(font.id)
      metrics.delete(font.id)
    }
    userFonts.value = userFonts.value.filter((font) => font.family !== name)
  }

  function hasFamily(name: string) {
    return variants.value.some((variant) => variant.family.toLowerCase() === name.trim().toLowerCase())
  }

  return { variants, families, ready, init, ensureLoaded, renderFont, addFont, removeFamily, hasFamily }
})
