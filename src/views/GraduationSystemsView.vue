<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import { useGraduationSystemsStore } from '@/stores/graduationSystems'
import { useUiStore } from '@/stores/ui'
import { colorsIn } from '@/lib/colorRuns'
import type { GraduationSystem } from '@/lib/graduationSystems'
import ColorSwatches from '@/components/graduations/ColorSwatches.vue'
import NewSystemDialog from '@/components/graduations/NewSystemDialog.vue'

const systems = useGraduationSystemsStore()
const ui = useUiStore()
const router = useRouter()
const creating = ref(false)

function onCreated(system: GraduationSystem) {
  creating.value = false
  router.push(`/graduacoes/${system.id}`)
}

function levelsLabel(system: GraduationSystem) {
  return system.levels.length === 1 ? '1 graduação' : `${system.levels.length} graduações`
}

/** Algumas graduações de exemplo, com as cores, para reconhecer o sistema na lista. */
function preview(system: GraduationSystem) {
  return system.levels.slice(0, 6).map((level) => ({ id: level.id, name: level.name, colors: colorsIn(level.name, system.colors) }))
}

async function duplicate(system: GraduationSystem) {
  const copy = await systems.duplicate(system.id)
  if (copy) ui.notify(`Sistema duplicado como "${copy.name}".`)
}

async function remove(system: GraduationSystem) {
  const ok = await ui.confirm({
    title: 'Excluir sistema',
    message: `O sistema "${system.name}" e as graduações dele serão apagados deste navegador. Modelos e lotes que usam este sistema passarão a usar outro.`,
    confirmLabel: 'Excluir sistema',
    danger: true,
  })
  if (!ok) return
  await systems.remove(system.id)
  ui.notify('Sistema excluído.')
}
</script>

<template>
  <div class="page">
    <header class="header">
      <div>
        <h1 class="page-title">Graduações</h1>
        <p class="muted">Cada sistema é a sequência de graduações de uma modalidade, grupo ou federação.</p>
      </div>
      <button type="button" class="btn btn--primary" @click="creating = true">
        <Plus :size="18" aria-hidden="true" />
        Criar sistema
      </button>
    </header>

    <section v-if="systems.items.length === 0" class="empty surface">
      <h2 class="section-title">Nenhum sistema de graduação</h2>
      <p class="muted">Crie um sistema do zero ou a partir de uma lista pronta (capoeira, judô, jiu-jitsu, karatê).</p>
      <button type="button" class="btn btn--primary" @click="creating = true">Criar sistema</button>
    </section>

    <ul v-else class="list">
      <li v-for="system in systems.sorted" :key="system.id" class="item surface">
        <div class="item__main">
          <h2 class="item__title">
            <RouterLink :to="`/graduacoes/${system.id}`">{{ system.name }}</RouterLink>
          </h2>
          <p class="muted small">{{ system.levelLabel }}, {{ levelsLabel(system) }}</p>
          <ul class="levels">
            <li v-for="level in preview(system)" :key="level.id" class="level">
              <ColorSwatches :colors="level.colors" :size="12" />
              {{ level.name }}
            </li>
            <li v-if="system.levels.length > 6" class="level muted">e mais {{ system.levels.length - 6 }}</li>
          </ul>
        </div>
        <div class="item__actions">
          <RouterLink :to="`/graduacoes/${system.id}`" class="btn btn--secondary btn--sm">Editar</RouterLink>
          <button type="button" class="btn btn--ghost btn--sm" @click="duplicate(system)">Duplicar</button>
          <button type="button" class="btn btn--ghost btn--sm danger" @click="remove(system)">Excluir</button>
        </div>
      </li>
    </ul>

    <NewSystemDialog :open="creating" @close="creating = false" @created="onCreated" />
  </div>
</template>

<style scoped>
.header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--esp-4);
  margin-bottom: var(--esp-6);
}

.header p {
  margin-top: var(--esp-1);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--esp-4);
  padding: var(--esp-4) var(--esp-5);
}

.item__main {
  display: flex;
  flex-direction: column;
  gap: var(--esp-1);
  min-width: 0;
}

.item__title {
  font-size: var(--texto-lg);
}

.item__title a {
  color: var(--cor-texto);
  text-decoration: none;
}

.item__title a:hover {
  color: var(--cor-primaria);
  text-decoration: underline;
}

.levels {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-1) var(--esp-4);
  margin: var(--esp-2) 0 0;
  padding: 0;
  list-style: none;
  font-size: var(--texto-sm);
}

.level {
  display: inline-flex;
  align-items: center;
  gap: var(--esp-1);
}

.item__actions {
  display: flex;
  gap: var(--esp-1);
}

.danger {
  color: var(--cor-erro);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--esp-3);
  max-width: var(--largura-texto);
  margin: var(--esp-8) auto 0;
  padding: var(--esp-8) var(--esp-5);
  text-align: center;
}
</style>
