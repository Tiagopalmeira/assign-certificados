<script setup lang="ts">
import { Calendar, Image, MapPin, Medal, PenLine, Type, User } from 'lucide-vue-next'
import type { FieldType } from '@/types'
import { FIELD_TYPES, fieldLabel } from '@/lib/fields'
import { resolveFieldText } from '@/lib/fieldText'
import { useTemplateEditor } from '@/composables/useTemplateEditor'

const editor = useTemplateEditor()

const ICONS: Record<FieldType, unknown> = {
  name: User,
  graduation: Medal,
  date: Calendar,
  location: MapPin,
  signature: PenLine,
  text: Type,
  image: Image,
}

function summary(fieldId: string) {
  const field = editor.template.value.fields.find((f) => f.id === fieldId)
  if (!field || field.type !== 'text') return ''
  const text = resolveFieldText(field, {
    name: 'nome',
    graduation: 'graduação',
    graduationTitle: 'título',
    graduationPalette: [],
    date: editor.template.value.defaults.date,
    location: editor.template.value.defaults.location,
    signerName: editor.template.value.defaults.signerName,
  })
  return text.length > 28 ? `${text.slice(0, 28)}…` : text
}
</script>

<template>
  <div class="toolbar">
    <section aria-labelledby="add-field-title">
      <h2 id="add-field-title" class="panel-title">Adicionar campo</h2>
      <div class="add-list">
        <button
          v-for="info in FIELD_TYPES"
          :key="info.type"
          type="button"
          class="add-item"
          :title="info.description"
          @click="editor.addField(info.type)"
        >
          <component :is="ICONS[info.type]" :size="18" aria-hidden="true" />
          {{ info.label }}
        </button>
      </div>
    </section>

    <section v-if="editor.template.value.fields.length" aria-labelledby="fields-title" class="fields">
      <h2 id="fields-title" class="panel-title">Campos no modelo</h2>
      <ul class="field-list">
        <li v-for="field in [...editor.template.value.fields].reverse()" :key="field.id">
          <button
            type="button"
            class="field-item"
            :class="{ 'field-item--active': editor.selectedId.value === field.id }"
            :aria-pressed="editor.selectedId.value === field.id"
            @click="editor.selectedId.value = field.id"
          >
            <component :is="ICONS[field.type]" :size="16" aria-hidden="true" />
            <span class="field-item__name">{{ fieldLabel(field.type) }}</span>
            <span v-if="summary(field.id)" class="field-item__hint">{{ summary(field.id) }}</span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-direction: column;
  gap: var(--esp-6);
}

.panel-title {
  margin-bottom: var(--esp-2);
  font-size: var(--texto-sm);
  font-weight: var(--peso-forte);
}

.add-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 116px), 1fr));
  gap: var(--esp-2);
}

.add-item {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  min-width: 0;
  min-height: 40px;
  padding: 0 var(--esp-2) 0 var(--esp-3);
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio);
  background: var(--cor-fundo);
  color: var(--cor-texto);
  font: inherit;
  font-size: var(--texto-sm);
  cursor: pointer;
}

.add-item svg {
  color: var(--cor-primaria);
  flex-shrink: 0;
}

.add-item:hover {
  border-color: var(--cor-primaria);
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.field-item {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  width: 100%;
  min-height: 36px;
  padding: 0 var(--esp-2);
  border: 0;
  border-radius: var(--raio);
  background: none;
  color: var(--cor-texto);
  font: inherit;
  font-size: var(--texto-sm);
  text-align: left;
  cursor: pointer;
}

.field-item:hover {
  background: var(--cor-fundo-alt);
}

.field-item--active {
  background: var(--cor-primaria-suave);
  color: var(--cor-primaria);
  font-weight: var(--peso-medio);
}

.field-item__hint {
  min-width: 0;
  overflow: hidden;
  color: var(--cor-texto-secundario);
  font-weight: var(--peso-normal);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
