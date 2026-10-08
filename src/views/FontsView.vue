<script setup lang="ts">
import { computed, ref } from 'vue'
import { CircleAlert } from 'lucide-vue-next'
import FileDrop from '@/components/ui/FileDrop.vue'
import { ACCEPTED_FONT_EXTENSIONS, cssFamilyFor, detectFontInfo, fontFileExtension } from '@/lib/fonts'
import { useFontsStore, type FontFamily } from '@/stores/fonts'
import { useTemplatesStore } from '@/stores/templates'
import { useUiStore } from '@/stores/ui'
import type { FontVariant } from '@/types'

const fonts = useFontsStore()
const templates = useTemplatesStore()
const ui = useUiStore()

const SAMPLE = 'Certificamos que João da Silva recebeu a faixa azul'

const pendingFile = ref<File | null>(null)
const family = ref('')
type StyleKey = '400' | '700' | '400i' | '700i'
const styleChoice = ref<StyleKey>('400')
const error = ref('')
const saving = ref(false)

const accept = ACCEPTED_FONT_EXTENSIONS.map((ext) => `.${ext}`).join(',')

const STYLE_LABELS: Record<StyleKey, string> = {
  '400': 'Regular',
  '700': 'Negrito',
  '400i': 'Itálico',
  '700i': 'Negrito itálico',
}

function styleKey(variant: Pick<FontVariant, 'weight' | 'italic'>) {
  return `${variant.weight}${variant.italic ? 'i' : ''}` as StyleKey
}

const sortedFamilies = computed(() =>
  [...fonts.families].sort((a, b) => (a.source === b.source ? a.name.localeCompare(b.name) : a.source === 'user' ? -1 : 1)),
)

function previewVariant(item: FontFamily): FontVariant {
  return item.variants.find((v) => v.weight === 400 && !v.italic) ?? item.variants[0]
}

function previewStyle(item: FontFamily) {
  const variant = previewVariant(item)
  void fonts.ensureLoaded(variant)
  return { fontFamily: `'${cssFamilyFor(variant)}', var(--fonte)` }
}

async function onFile(file: File) {
  error.value = ''
  pendingFile.value = null
  if (!ACCEPTED_FONT_EXTENSIONS.includes(fontFileExtension(file.name))) {
    error.value = 'Formato não aceito. Envie um arquivo TTF, OTF, WOFF ou WOFF2.'
    return
  }
  try {
    const info = detectFontInfo(new Uint8Array(await file.arrayBuffer()), file.name.replace(/\.[^.]+$/, ''))
    pendingFile.value = file
    family.value = info.family
    styleChoice.value = styleKey(info)
  } catch {
    error.value = 'Não conseguimos ler esta fonte. O arquivo pode estar corrompido.'
  }
}

const duplicateVariant = computed(() => {
  const name = family.value.trim().toLowerCase()
  return fonts.variants.find((v) => v.family.toLowerCase() === name && styleKey(v) === styleChoice.value) ?? null
})

async function addFont() {
  if (!pendingFile.value) return
  if (!family.value.trim()) {
    error.value = 'Informe o nome da fonte.'
    return
  }
  if (duplicateVariant.value) {
    error.value = `A fonte ${duplicateVariant.value.family} já tem o estilo ${STYLE_LABELS[styleChoice.value].toLowerCase()}.`
    return
  }
  saving.value = true
  try {
    const existing = fonts.variants.find((v) => v.family.toLowerCase() === family.value.trim().toLowerCase())
    const name = existing?.family ?? family.value.trim()
    const weight = styleChoice.value.startsWith('700') ? 700 : 400
    await fonts.addFont(pendingFile.value, name, weight, styleChoice.value.endsWith('i'))
    ui.notify(`Fonte ${name} adicionada.`)
    pendingFile.value = null
    family.value = ''
  } catch {
    error.value = 'Não foi possível salvar a fonte. Verifique o espaço disponível no navegador.'
  } finally {
    saving.value = false
  }
}

async function removeFamily(item: FontFamily) {
  const usage = templates.usageOfFont(item.name)
  const usageText = usage
    ? ` Ela é usada em ${usage === 1 ? '1 modelo' : `${usage} modelos`}; esses campos passarão a usar Inter.`
    : ''
  const ok = await ui.confirm({
    title: 'Remover fonte',
    message: `A fonte ${item.name} será removida deste navegador.${usageText}`,
    confirmLabel: 'Remover fonte',
    danger: true,
  })
  if (!ok) return
  await fonts.removeFamily(item.name)
  ui.notify('Fonte removida.')
}
</script>

<template>
  <div class="page page--narrow">
    <header class="header">
      <h1 class="page-title">Fontes</h1>
      <p class="muted">As fontes daqui aparecem na lista de fontes do editor.</p>
    </header>

    <section class="upload surface" aria-labelledby="add-font-title">
      <h2 id="add-font-title" class="section-title">Adicionar fonte</h2>
      <FileDrop
        :accept="accept"
        label="Escolha ou arraste o arquivo da fonte"
        help="TTF, OTF, WOFF ou WOFF2. Para ter negrito e itálico, envie cada estilo como um arquivo."
        :file-name="pendingFile?.name"
        :disabled="saving"
        @select="onFile"
      />

      <form v-if="pendingFile" class="upload__form" novalidate @submit.prevent="addFont">
        <div class="form-field">
          <label class="form-label" for="font-family">Nome da fonte</label>
          <input id="font-family" v-model="family" class="input" type="text" />
          <span class="form-help">Use o mesmo nome para juntar estilos da mesma fonte.</span>
        </div>
        <div class="form-field">
          <label class="form-label" for="font-style">Estilo</label>
          <select id="font-style" v-model="styleChoice" class="select">
            <option v-for="(label, key) in STYLE_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="upload__actions">
          <button type="button" class="btn btn--secondary" :disabled="saving" @click="pendingFile = null">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="saving">{{ saving ? 'Adicionando…' : 'Adicionar fonte' }}</button>
        </div>
      </form>

      <p v-if="error" class="form-error" role="alert">
        <CircleAlert :size="16" aria-hidden="true" />
        {{ error }}
      </p>
    </section>

    <section aria-labelledby="fonts-title">
      <h2 id="fonts-title" class="section-title list-title">Fontes disponíveis</h2>
      <ul class="font-list">
        <li v-for="item in sortedFamilies" :key="item.name" class="font">
          <div class="font__info">
            <div class="font__name">
              <span>{{ item.name }}</span>
              <span class="font__source">{{ item.source === 'builtin' ? 'Incluída no sistema' : 'Enviada por você' }}</span>
            </div>
            <p class="font__sample" :style="previewStyle(item)">{{ SAMPLE }}</p>
            <p class="font__styles">
              {{ item.variants.map((v) => STYLE_LABELS[styleKey(v)]).join(', ') }}
            </p>
          </div>
          <button v-if="item.source === 'user'" type="button" class="btn btn--danger btn--sm" @click="removeFamily(item)">Remover</button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.header {
  margin-bottom: var(--esp-6);
}

.header p {
  margin-top: var(--esp-1);
}

.upload {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
  margin-bottom: var(--esp-8);
  padding: var(--esp-5);
}

.upload__form {
  display: flex;
  flex-direction: column;
  gap: var(--esp-4);
}

.upload__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--esp-2);
}

.list-title {
  margin-bottom: var(--esp-3);
}

.font-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.font {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-4);
  padding: var(--esp-4) 0;
  border-bottom: 1px solid var(--cor-borda);
}

.font__info {
  min-width: 0;
}

.font__name {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--esp-2);
  font-weight: var(--peso-medio);
}

.font__source,
.font__styles {
  font-size: var(--texto-sm);
  font-weight: var(--peso-normal);
  color: var(--cor-texto-secundario);
}

.font__sample {
  margin: var(--esp-2) 0 var(--esp-1);
  font-size: var(--texto-xl);
  line-height: var(--altura-linha-titulo);
  overflow-wrap: anywhere;
}
</style>
