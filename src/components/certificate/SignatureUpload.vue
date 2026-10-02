<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { CircleAlert } from 'lucide-vue-next'
import FileDrop from '@/components/ui/FileDrop.vue'
import { removeSignatureBackground } from '@/lib/signature'
import { errorMessage } from '@/stores/ui'

/**
 * Envio de assinatura: remove o fundo automaticamente e mostra o resultado antes de usar.
 * O ajuste de sensibilidade ajuda quando o traço é claro ou o papel tem sombra.
 */
const emit = defineEmits<{ confirm: [blob: Blob]; cancel: [] }>()
withDefaults(defineProps<{ cancellable?: boolean }>(), { cancellable: false })

const original = ref<File | null>(null)
const result = ref<Blob | null>(null)
const resultUrl = ref<string | null>(null)
const sensitivity = ref(0.5)
const keepOriginal = ref(false)
const busy = ref(false)
const error = ref('')
const sliderId = `sensitivity-${Math.random().toString(36).slice(2)}`

function setResult(blob: Blob | null) {
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
  result.value = blob
  resultUrl.value = blob ? URL.createObjectURL(blob) : null
}

async function process() {
  if (!original.value) return
  busy.value = true
  error.value = ''
  try {
    if (keepOriginal.value) setResult(original.value)
    else setResult((await removeSignatureBackground(original.value, sensitivity.value)).blob)
  } catch (e) {
    setResult(null)
    error.value = errorMessage(e, 'Não foi possível processar a imagem.')
  } finally {
    busy.value = false
  }
}

function onFile(file: File) {
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    error.value = 'Envie a assinatura em PNG ou JPG.'
    return
  }
  original.value = file
  keepOriginal.value = false
  sensitivity.value = 0.5
  void process()
}

function confirm() {
  if (result.value) emit('confirm', result.value)
}

onBeforeUnmount(() => setResult(null))
</script>

<template>
  <div class="signature-upload">
    <FileDrop
      accept=".png,.jpg,.jpeg"
      label="Escolha a imagem da assinatura"
      help="PNG ou JPG. O fundo é removido automaticamente."
      :file-name="original?.name"
      :disabled="busy"
      compact
      @select="onFile"
    />

    <p v-if="error" class="form-error" role="alert">
      <CircleAlert :size="16" aria-hidden="true" />
      {{ error }}
    </p>

    <template v-if="original && !error">
      <div class="result checkerboard" :aria-busy="busy">
        <img v-if="resultUrl" :src="resultUrl" alt="Assinatura processada" />
        <span v-if="busy" class="muted small">Removendo fundo…</span>
      </div>

      <div v-if="!keepOriginal" class="form-field">
        <label class="form-label" :for="sliderId">Sensibilidade</label>
        <input
          :id="sliderId"
          v-model.number="sensitivity"
          type="range"
          min="0"
          max="1"
          step="0.05"
          :disabled="busy"
          @change="process"
        />
        <span class="form-help">Aumente se partes do traço sumirem; diminua se aparecerem manchas.</span>
      </div>

      <label class="choice small">
        <input v-model="keepOriginal" type="checkbox" @change="process" />
        Usar a imagem original, sem remover o fundo
      </label>
    </template>

    <div class="actions">
      <button v-if="cancellable" type="button" class="btn btn--secondary btn--sm" @click="emit('cancel')">Cancelar</button>
      <button v-if="result && !error" type="button" class="btn btn--primary btn--sm" :disabled="busy" @click="confirm">
        Usar esta assinatura
      </button>
    </div>
  </div>
</template>

<style scoped>
.signature-upload {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
}

.result {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 96px;
  padding: var(--esp-3);
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio);
}

.result img {
  max-height: 120px;
  object-fit: contain;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--esp-2);
}

.actions:empty {
  display: none;
}

input[type='range'] {
  width: 100%;
  accent-color: var(--cor-primaria);
}
</style>
