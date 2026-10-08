<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { MousePointerClick } from 'lucide-vue-next'
import { useTemplateEditor } from '@/composables/useTemplateEditor'
import { round } from '@/lib/geometry'
import { useGraduationSystemsStore } from '@/stores/graduationSystems'

/** Painel exibido quando nenhum campo está selecionado: dados gerais do modelo. */
const editor = useTemplateEditor()
const template = editor.template
const defaults = computed(() => template.value.defaults)
const systems = useGraduationSystemsStore()
const system = computed(() => systems.resolve(defaults.value.graduationSystemId))

const sourceDescription = computed(() => {
  const { source, width, height } = template.value
  const size = `${round(width, 0)} × ${round(height, 0)} pt`
  return source.kind === 'pdf' ? `PDF, ${size}` : `Imagem, ${size}`
})
</script>

<template>
  <div class="settings">
    <p class="notice">
      <MousePointerClick :size="18" aria-hidden="true" />
      <span>Clique em um campo no certificado para editar fonte, cor e posição.</span>
    </p>

    <section class="group">
      <h2 class="group__title">Dados do modelo</h2>
      <div class="form-field">
        <label class="form-label" for="tpl-system">Sistema de graduação</label>
        <select
          id="tpl-system"
          class="select input--sm"
          :value="system?.id"
          @change="editor.updateDefaults({ graduationSystemId: ($event.target as HTMLSelectElement).value }); editor.commit()"
        >
          <option v-for="item in systems.sorted" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
        <RouterLink to="/graduacoes" class="form-help">Criar ou editar sistemas de graduação</RouterLink>
      </div>
      <div class="form-field">
        <label class="form-label" for="tpl-date">Data padrão</label>
        <input
          id="tpl-date"
          class="input input--sm"
          type="date"
          :value="defaults.date"
          @input="editor.updateDefaults({ date: ($event.target as HTMLInputElement).value })"
          @change="editor.commit()"
        />
      </div>
      <div class="form-field">
        <label class="form-label" for="tpl-location">Local padrão</label>
        <input
          id="tpl-location"
          class="input input--sm"
          type="text"
          placeholder="Araçás - BA"
          :value="defaults.location"
          @input="editor.updateDefaults({ location: ($event.target as HTMLInputElement).value })"
          @change="editor.commit()"
        />
      </div>
      <div class="form-field">
        <label class="form-label" for="tpl-signer">Nome de quem assina</label>
        <input
          id="tpl-signer"
          class="input input--sm"
          type="text"
          placeholder="Prof. Ana Lima"
          :value="defaults.signerName"
          @input="editor.updateDefaults({ signerName: ($event.target as HTMLInputElement).value })"
          @change="editor.commit()"
        />
      </div>
      <p class="form-help">Esses valores aparecem já preenchidos ao criar um lote e podem ser trocados lá.</p>
    </section>

    <section class="group">
      <h2 class="group__title">Arquivo</h2>
      <p class="small">{{ template.source.fileName }}</p>
      <p class="small muted">{{ sourceDescription }}</p>
    </section>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: var(--esp-5);
}

.group {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
}

.group__title {
  font-size: var(--texto-sm);
  font-weight: var(--peso-forte);
}

.notice svg {
  flex-shrink: 0;
  color: var(--cor-primaria);
}
</style>
