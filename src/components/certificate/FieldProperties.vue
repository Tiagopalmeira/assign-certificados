<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { AlignCenter, AlignLeft, AlignRight, BringToFront, Copy, SendToBack, Trash2 } from 'lucide-vue-next'
import type { CertificateField, GraduationDisplay, TextAlign, TextStyle } from '@/types'
import { fieldLabel } from '@/lib/fields'
import { hasText, PLACEHOLDER_HELP } from '@/lib/fieldText'
import { isGraduationField } from '@/lib/colorRuns'
import { isValidHex } from '@/lib/color'
import { round } from '@/lib/geometry'
import { useTemplateEditor } from '@/composables/useTemplateEditor'
import { useFontsStore } from '@/stores/fonts'
import { useFilesStore } from '@/stores/files'
import { errorMessage, useUiStore } from '@/stores/ui'
import FileDrop from '@/components/ui/FileDrop.vue'
import SignatureUpload from './SignatureUpload.vue'

const props = defineProps<{ field: CertificateField }>()

const editor = useTemplateEditor()
const fonts = useFontsStore()
const files = useFilesStore()
const ui = useUiStore()

const defaults = computed(() => editor.template.value.defaults)
const id = (name: string) => `prop-${name}`
const replacingSignature = ref(false)
const hexDraft = ref(props.field.style.color)

watch(
  () => [props.field.id, props.field.style.color] as const,
  () => (hexDraft.value = props.field.style.color),
)
watch(
  () => props.field.id,
  () => (replacingSignature.value = false),
)

const ALIGNMENTS: { value: TextAlign; label: string; icon: unknown }[] = [
  { value: 'left', label: 'À esquerda', icon: AlignLeft },
  { value: 'center', label: 'Centralizado', icon: AlignCenter },
  { value: 'right', label: 'À direita', icon: AlignRight },
]

function numberFrom(event: Event): number | null {
  const value = parseFloat((event.target as HTMLInputElement).value.replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

function setGeometry(key: 'x' | 'y' | 'width' | 'height' | 'rotation', event: Event) {
  const value = numberFrom(event)
  if (value === null) return
  const min = key === 'width' || key === 'height' ? 6 : -Infinity
  editor.updateField(props.field.id, { [key]: Math.max(min, value) })
}

function setStyleNumber(key: 'fontSize' | 'letterSpacing' | 'lineHeight', event: Event) {
  const value = numberFrom(event)
  if (value === null) return
  const min = key === 'fontSize' ? 1 : key === 'lineHeight' ? 0.5 : -50
  editor.updateStyle(props.field.id, { [key]: Math.max(min, value) })
}

function setStyle<K extends keyof TextStyle>(key: K, value: TextStyle[K]) {
  editor.updateStyle(props.field.id, { [key]: value } as Partial<TextStyle>)
  editor.commit()
}

function setText(key: 'prefix' | 'suffix' | 'text', event: Event) {
  editor.updateField(props.field.id, { [key]: (event.target as HTMLInputElement).value })
}

function onHexInput() {
  if (isValidHex(hexDraft.value)) editor.updateStyle(props.field.id, { color: hexDraft.value })
}

function onHexChange() {
  if (isValidHex(hexDraft.value)) editor.commit()
  else hexDraft.value = props.field.style.color
}

async function onImage(file: File) {
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    ui.notify('Envie a imagem em PNG ou JPG.', 'error')
    return
  }
  try {
    const imageId = await files.save(file, file.name)
    editor.updateField(props.field.id, { imageId })
    editor.commit()
  } catch (e) {
    ui.notify(errorMessage(e, 'Não foi possível salvar a imagem.'), 'error')
  }
}

async function onSignature(blob: Blob) {
  const imageId = await files.save(blob, 'assinatura.png')
  editor.updateDefaults({ signatureImageId: imageId })
  editor.commit()
  replacingSignature.value = false
}

function removeSignature() {
  editor.updateDefaults({ signatureImageId: null })
  editor.commit()
}

const signatureUrl = computed(() => files.urlFor(defaults.value.signatureImageId))
const imageUrl = computed(() => files.urlFor(props.field.imageId))
</script>

<template>
  <div class="props">
    <header class="props__header">
      <h2 class="props__title">{{ fieldLabel(field.type) }}</h2>
      <div class="props__actions">
        <button type="button" class="btn btn--ghost btn--icon btn--sm" title="Trazer para frente" aria-label="Trazer para frente" @click="editor.reorder(field.id, 'front')">
          <BringToFront :size="16" aria-hidden="true" />
        </button>
        <button type="button" class="btn btn--ghost btn--icon btn--sm" title="Enviar para trás" aria-label="Enviar para trás" @click="editor.reorder(field.id, 'back')">
          <SendToBack :size="16" aria-hidden="true" />
        </button>
        <button type="button" class="btn btn--ghost btn--icon btn--sm" title="Duplicar campo" aria-label="Duplicar campo" @click="editor.duplicateField(field.id)">
          <Copy :size="16" aria-hidden="true" />
        </button>
        <button type="button" class="btn btn--ghost btn--icon btn--sm props__delete" title="Excluir campo" aria-label="Excluir campo" @click="editor.removeField(field.id)">
          <Trash2 :size="16" aria-hidden="true" />
        </button>
      </div>
    </header>

    <!-- Conteúdo, específico de cada tipo -->
    <section class="group">
      <h3 class="group__title">Conteúdo</h3>

      <p v-if="field.type === 'name'" class="form-help">O nome de cada aluno é colocado aqui.</p>
      <template v-if="isGraduationField(field)">
        <p v-if="field.type === 'graduation'" class="form-help">A graduação escolhida no lote é colocada aqui.</p>
        <p v-else class="form-help">
          A graduação de onde o aluno veio: a que vem antes no sistema de graduação. Pode ser trocada em cada grupo do lote.
        </p>
        <div class="form-field">
          <label class="form-label" :for="id('graduation-display')">Mostrar</label>
          <select
            :id="id('graduation-display')"
            class="select input--sm"
            :value="field.graduationDisplay ?? 'graduation-title'"
            @change="editor.updateField(field.id, { graduationDisplay: ($event.target as HTMLSelectElement).value as GraduationDisplay }); editor.commit()"
          >
            <option value="graduation-title">Graduação e título (Preta - Professor)</option>
            <option value="graduation">Só a graduação (Preta)</option>
            <option value="title">Só o título (Professor)</option>
          </select>
          <span class="form-help">Graduações sem título mostram só a graduação.</span>
        </div>
        <label class="choice small">
          <input
            type="checkbox"
            :checked="field.colorizeGraduation !== false"
            @change="editor.updateField(field.id, { colorizeGraduation: ($event.target as HTMLInputElement).checked }); editor.commit()"
          />
          Pintar as cores com a própria cor
        </label>
        <span class="form-help">As cores de cada palavra (Azul, Roxa…) ficam no sistema de graduação, em Graduações.</span>
      </template>

      <template v-if="field.type === 'date'">
        <div class="form-field">
          <label class="form-label" :for="id('date')">Data do modelo</label>
          <input
            :id="id('date')"
            class="input input--sm"
            type="date"
            :value="defaults.date"
            @input="editor.updateDefaults({ date: ($event.target as HTMLInputElement).value })"
            @change="editor.commit()"
          />
          <span class="form-help">Pode ser trocada em cada lote.</span>
        </div>
        <div class="form-field">
          <label class="form-label" :for="id('date-format')">Formato</label>
          <select
            :id="id('date-format')"
            class="select input--sm"
            :value="field.dateFormat"
            @change="editor.updateField(field.id, { dateFormat: ($event.target as HTMLSelectElement).value as 'short' | 'long' }); editor.commit()"
          >
            <option value="short">02/10/2026</option>
            <option value="long">2 de outubro de 2026</option>
          </select>
        </div>
      </template>

      <div v-if="field.type === 'location'" class="form-field">
        <label class="form-label" :for="id('location')">Local do modelo</label>
        <input
          :id="id('location')"
          class="input input--sm"
          type="text"
          placeholder="Araçás - BA"
          :value="defaults.location"
          @input="editor.updateDefaults({ location: ($event.target as HTMLInputElement).value })"
          @change="editor.commit()"
        />
        <span class="form-help">Pode ser trocado em cada lote.</span>
      </div>

      <template v-if="field.type === 'signature'">
        <div v-if="signatureUrl && !replacingSignature" class="image-preview checkerboard">
          <img :src="signatureUrl" alt="Assinatura do modelo" />
        </div>
        <div v-if="signatureUrl && !replacingSignature" class="inline-actions">
          <button type="button" class="btn btn--secondary btn--sm" @click="replacingSignature = true">Trocar assinatura</button>
          <button type="button" class="btn btn--ghost btn--sm props__delete" @click="removeSignature">Remover</button>
        </div>
        <SignatureUpload v-else :cancellable="Boolean(signatureUrl)" @confirm="onSignature" @cancel="replacingSignature = false" />

        <div class="form-field">
          <label class="form-label" :for="id('signer')">Nome de quem assina</label>
          <input
            :id="id('signer')"
            class="input input--sm"
            type="text"
            placeholder="Prof. Ana Lima"
            :value="defaults.signerName"
            @input="editor.updateDefaults({ signerName: ($event.target as HTMLInputElement).value })"
            @change="editor.commit()"
          />
        </div>
        <label class="choice small">
          <input
            type="checkbox"
            :checked="field.showSignerName"
            @change="editor.updateField(field.id, { showSignerName: ($event.target as HTMLInputElement).checked }); editor.commit()"
          />
          Mostrar o nome abaixo da assinatura
        </label>
      </template>

      <div v-if="field.type === 'text'" class="form-field">
        <label class="form-label" :for="id('text')">Texto</label>
        <textarea
          :id="id('text')"
          class="textarea input--sm"
          rows="4"
          :value="field.text"
          @input="setText('text', $event)"
          @change="editor.commit()"
        />
        <span class="form-help">Para incluir dados do aluno ou do evento, use {{ PLACEHOLDER_HELP }}.</span>
      </div>

      <template v-if="field.type === 'image'">
        <div v-if="imageUrl" class="image-preview checkerboard">
          <img :src="imageUrl" alt="Imagem do campo" />
        </div>
        <FileDrop
          accept=".png,.jpg,.jpeg"
          :label="imageUrl ? 'Trocar imagem' : 'Escolha a imagem'"
          help="PNG ou JPG, como o logo do grupo."
          compact
          @select="onImage"
        />
      </template>

      <div v-if="['name', 'graduation', 'previous-graduation', 'date', 'location'].includes(field.type)" class="row">
        <div class="form-field">
          <label class="form-label" :for="id('prefix')">Texto antes (opcional)</label>
          <input :id="id('prefix')" class="input input--sm" type="text" :value="field.prefix" @input="setText('prefix', $event)" @change="editor.commit()" />
        </div>
        <div class="form-field">
          <label class="form-label" :for="id('suffix')">Texto depois (opcional)</label>
          <input :id="id('suffix')" class="input input--sm" type="text" :value="field.suffix" @input="setText('suffix', $event)" @change="editor.commit()" />
        </div>
      </div>
    </section>

    <!-- Texto -->
    <section v-if="hasText(field)" class="group">
      <h3 class="group__title">Texto</h3>
      <div class="form-field">
        <label class="form-label" :for="id('font')">Fonte</label>
        <select :id="id('font')" class="select input--sm" :value="field.style.fontFamily" @change="setStyle('fontFamily', ($event.target as HTMLSelectElement).value)">
          <option v-for="family in fonts.families" :key="family.name" :value="family.name">{{ family.name }}</option>
          <option v-if="!fonts.hasFamily(field.style.fontFamily)" :value="field.style.fontFamily">
            {{ field.style.fontFamily }} (removida, usando Inter)
          </option>
        </select>
        <RouterLink to="/fontes" class="form-help">Adicionar fontes</RouterLink>
      </div>
      <div class="row">
        <div class="form-field">
          <label class="form-label" :for="id('size')">Tamanho</label>
          <input :id="id('size')" class="input input--sm" type="number" min="1" step="1" :value="round(field.style.fontSize)" @input="setStyleNumber('fontSize', $event)" @change="editor.commit()" />
        </div>
        <div class="form-field">
          <label class="form-label" :for="id('color-hex')">Cor</label>
          <div class="color">
            <input
              class="color__swatch"
              type="color"
              aria-label="Escolher cor"
              :value="field.style.color"
              @input="editor.updateStyle(field.id, { color: ($event.target as HTMLInputElement).value })"
              @change="editor.commit()"
            />
            <input :id="id('color-hex')" v-model="hexDraft" class="input input--sm" type="text" maxlength="7" spellcheck="false" @input="onHexInput" @change="onHexChange" />
          </div>
        </div>
      </div>

      <div class="form-field">
        <span :id="id('align-label')" class="form-label">Alinhamento</span>
        <div class="segmented" role="group" :aria-labelledby="id('align-label')">
          <button
            v-for="option in ALIGNMENTS"
            :key="option.value"
            type="button"
            class="segmented__item"
            :aria-pressed="field.style.align === option.value"
            :aria-label="option.label"
            :title="option.label"
            @click="setStyle('align', option.value)"
          >
            <component :is="option.icon" :size="16" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div class="checks">
        <label class="choice small">
          <input type="checkbox" :checked="field.style.bold" @change="setStyle('bold', ($event.target as HTMLInputElement).checked)" />
          Negrito
        </label>
        <label class="choice small">
          <input type="checkbox" :checked="field.style.italic" @change="setStyle('italic', ($event.target as HTMLInputElement).checked)" />
          Itálico
        </label>
      </div>

      <div class="row">
        <div class="form-field">
          <label class="form-label" :for="id('spacing')">Espaçamento</label>
          <input :id="id('spacing')" class="input input--sm" type="number" step="0.5" :value="round(field.style.letterSpacing)" @input="setStyleNumber('letterSpacing', $event)" @change="editor.commit()" />
        </div>
        <div v-if="field.type === 'text'" class="form-field">
          <label class="form-label" :for="id('line-height')">Altura da linha</label>
          <input :id="id('line-height')" class="input input--sm" type="number" step="0.05" min="0.5" :value="round(field.style.lineHeight, 2)" @input="setStyleNumber('lineHeight', $event)" @change="editor.commit()" />
        </div>
      </div>

      <label class="choice small">
        <input
          type="checkbox"
          :checked="field.shrinkToFit"
          @change="editor.updateField(field.id, { shrinkToFit: ($event.target as HTMLInputElement).checked }); editor.commit()"
        />
        Diminuir a fonte quando o texto não couber
      </label>
    </section>

    <!-- Posição -->
    <section class="group">
      <h3 class="group__title">Posição e tamanho</h3>
      <div class="row">
        <div class="form-field">
          <label class="form-label" :for="id('x')">X</label>
          <input :id="id('x')" class="input input--sm" type="number" step="1" :value="round(field.x)" @input="setGeometry('x', $event)" @change="editor.commit()" />
        </div>
        <div class="form-field">
          <label class="form-label" :for="id('y')">Y</label>
          <input :id="id('y')" class="input input--sm" type="number" step="1" :value="round(field.y)" @input="setGeometry('y', $event)" @change="editor.commit()" />
        </div>
        <div class="form-field">
          <label class="form-label" :for="id('w')">Largura</label>
          <input :id="id('w')" class="input input--sm" type="number" min="6" step="1" :value="round(field.width)" @input="setGeometry('width', $event)" @change="editor.commit()" />
        </div>
        <div class="form-field">
          <label class="form-label" :for="id('h')">Altura</label>
          <input :id="id('h')" class="input input--sm" type="number" min="6" step="1" :value="round(field.height)" @input="setGeometry('height', $event)" @change="editor.commit()" />
        </div>
        <div class="form-field">
          <label class="form-label" :for="id('rotation')">Rotação (graus)</label>
          <input :id="id('rotation')" class="input input--sm" type="number" step="1" :value="round(field.rotation)" @input="setGeometry('rotation', $event)" @change="editor.commit()" />
        </div>
      </div>
      <button
        type="button"
        class="btn btn--secondary btn--sm"
        @click="editor.updateField(field.id, { x: (editor.template.value.width - field.width) / 2 }); editor.commit()"
      >
        Centralizar na horizontal
      </button>
    </section>
  </div>
</template>

<style scoped>
.props {
  display: flex;
  flex-direction: column;
  gap: var(--esp-5);
}

.props__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-2);
}

.props__title {
  font-size: var(--texto-lg);
}

.props__actions {
  display: flex;
  gap: 2px;
}

.props__delete {
  color: var(--cor-erro);
}

.group {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  padding-top: var(--esp-4);
  border-top: 1px solid var(--cor-borda);
}

.group__title {
  font-size: var(--texto-sm);
  font-weight: var(--peso-forte);
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--esp-3);
}

.checks {
  display: flex;
  gap: var(--esp-5);
}

.color {
  display: flex;
  gap: var(--esp-2);
}

.color__swatch {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio-sm);
  background: var(--cor-fundo);
  cursor: pointer;
}

.segmented {
  display: inline-flex;
  align-self: flex-start;
  padding: 2px;
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio);
}

.segmented__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 30px;
  border: 0;
  border-radius: var(--raio-sm);
  background: none;
  color: var(--cor-texto-secundario);
  cursor: pointer;
}

.segmented__item[aria-pressed='true'] {
  background: var(--cor-primaria-suave);
  color: var(--cor-primaria);
}

.image-preview {
  display: flex;
  justify-content: center;
  padding: var(--esp-3);
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio);
}

.image-preview img {
  max-height: 96px;
  object-fit: contain;
}

.inline-actions {
  display: flex;
  gap: var(--esp-2);
}
</style>
