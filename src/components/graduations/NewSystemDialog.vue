<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { GRADUATION_PRESETS } from '@/lib/graduationSystems'
import { useGraduationSystemsStore } from '@/stores/graduationSystems'
import { errorMessage, useUiStore } from '@/stores/ui'
import type { GraduationSystem } from '@/lib/graduationSystems'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; created: [system: GraduationSystem] }>()

const systems = useGraduationSystemsStore()
const ui = useUiStore()
const choice = ref<string>('empty')
const busy = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) choice.value = 'empty'
  },
)

async function create() {
  busy.value = true
  try {
    const preset = GRADUATION_PRESETS.find((p) => p.id === choice.value)
    const system = preset ? await systems.createFromPreset(preset) : await systems.createEmpty()
    emit('created', system)
  } catch (error) {
    ui.notify(errorMessage(error, 'Não foi possível criar o sistema.'), 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    title="Criar sistema de graduação"
    description="Comece do zero ou a partir de uma lista pronta, que você pode ajustar depois."
    :locked="busy"
    @close="emit('close')"
  >
    <fieldset class="choices">
      <legend class="visually-hidden">Começar de</legend>
      <label class="choice">
        <input v-model="choice" type="radio" name="system-start" value="empty" />
        <span>
          Em branco
          <span class="choice__help">Você cadastra as graduações e as cores.</span>
        </span>
      </label>
      <label v-for="preset in GRADUATION_PRESETS" :key="preset.id" class="choice">
        <input v-model="choice" type="radio" name="system-start" :value="preset.id" />
        <span>
          {{ preset.name }}
          <span class="choice__help">{{ preset.levels.length }} graduações</span>
        </span>
      </label>
    </fieldset>
    <template #footer>
      <button type="button" class="btn btn--secondary" :disabled="busy" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn btn--primary" :disabled="busy" @click="create">
        {{ busy ? 'Criando…' : 'Criar sistema' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.choices {
  display: flex;
  flex-direction: column;
  gap: var(--esp-2);
  margin: 0;
  padding: 0;
  border: 0;
}

.choice__help {
  display: block;
  font-size: var(--texto-sm);
  color: var(--cor-texto-secundario);
}
</style>
