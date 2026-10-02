<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import type { StudentGroup } from '@/types'

const props = defineProps<{ group: StudentGroup }>()
const emit = defineEmits<{ edit: []; remove: []; removeStudent: [index: number] }>()

const countLabel = computed(() => (props.group.names.length === 1 ? '1 aluno' : `${props.group.names.length} alunos`))
</script>

<template>
  <section class="group surface" :aria-label="`Graduação ${group.graduation}`">
    <header class="group__header">
      <div>
        <h3 class="group__title">Graduação: {{ group.graduation }}</h3>
        <p class="muted small">{{ countLabel }}</p>
      </div>
      <div class="group__actions">
        <button type="button" class="btn btn--ghost btn--sm" @click="emit('edit')">Editar</button>
        <button type="button" class="btn btn--ghost btn--sm danger" @click="emit('remove')">Remover grupo</button>
      </div>
    </header>
    <ul class="names">
      <li v-for="(name, index) in group.names" :key="`${index}-${name}`" class="name">
        <span>{{ name }}</span>
        <button
          type="button"
          class="btn btn--ghost btn--icon btn--sm name__remove"
          :aria-label="`Remover ${name}`"
          :title="`Remover ${name}`"
          @click="emit('removeStudent', index)"
        >
          <X :size="16" aria-hidden="true" />
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.group {
  padding: var(--esp-4) var(--esp-5);
}

.group__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--esp-2);
  margin-bottom: var(--esp-3);
}

.group__title {
  font-size: var(--texto-md);
}

.group__actions {
  display: flex;
  gap: var(--esp-1);
  margin-right: calc(-1 * var(--esp-2));
}

.danger {
  color: var(--cor-erro);
}

.names {
  margin: 0;
  padding: 0;
  list-style: none;
}

.name {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-2);
  min-height: 40px;
  border-top: 1px solid var(--cor-borda);
}

.name span {
  overflow-wrap: anywhere;
}

.name__remove {
  color: var(--cor-texto-secundario);
}
</style>
