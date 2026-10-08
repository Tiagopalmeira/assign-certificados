<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useTemplatesStore } from '@/stores/templates'
import { useFontsStore } from '@/stores/fonts'
import { useGraduationSystemsStore } from '@/stores/graduationSystems'
import { useLotsStore } from '@/stores/lots'
import ToastHost from '@/components/ui/ToastHost.vue'
import ConfirmHost from '@/components/ui/ConfirmHost.vue'

const route = useRoute()
const ready = ref(false)
const loadError = ref('')

onMounted(async () => {
  try {
    await Promise.all([useTemplatesStore().init(), useFontsStore().init(), useGraduationSystemsStore().init(), useLotsStore().init()])
  } catch (error) {
    console.error(error)
    loadError.value =
      'Não foi possível abrir os dados salvos neste navegador. Verifique se o armazenamento do site não está bloqueado e recarregue a página.'
  } finally {
    ready.value = true
  }
})
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner" :class="{ 'app-header__inner--full': route.meta.fullWidth }">
      <RouterLink to="/modelos" class="brand">
        <img src="/logo-160.png" alt="" width="36" height="36" />
        <span>CertAssign</span>
      </RouterLink>
      <nav class="nav" aria-label="Principal">
        <RouterLink to="/modelos" class="nav__link" active-class="nav__link--active">Meus modelos</RouterLink>
        <RouterLink to="/graduacoes" class="nav__link" active-class="nav__link--active">Graduações</RouterLink>
        <RouterLink to="/fontes" class="nav__link" active-class="nav__link--active">Fontes</RouterLink>
      </nav>
    </div>
  </header>

  <main class="app-main">
    <p v-if="loadError" class="notice notice--error app-error" role="alert">{{ loadError }}</p>
    <RouterView v-else-if="ready" />
  </main>

  <ToastHost />
  <ConfirmHost />
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--cor-fundo);
  border-bottom: 1px solid var(--cor-borda);
}

.app-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-4);
  max-width: var(--largura-pagina);
  height: 60px;
  margin: 0 auto;
  padding: 0 var(--esp-4);
}

.app-header__inner--full {
  max-width: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  color: var(--cor-texto);
  font-weight: var(--peso-forte);
  text-decoration: none;
}

.nav {
  display: flex;
  gap: var(--esp-1);
}

.nav__link {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 var(--esp-3);
  border-radius: var(--raio);
  color: var(--cor-texto-secundario);
  font-size: var(--texto-sm);
  font-weight: var(--peso-medio);
  text-decoration: none;
}

.nav__link:hover {
  color: var(--cor-texto);
  background: var(--cor-fundo-alt);
}

.nav__link--active {
  color: var(--cor-primaria);
  background: var(--cor-primaria-suave);
}

.app-error {
  max-width: var(--largura-texto);
  margin: var(--esp-6) auto;
}

@media (max-width: 480px) {
  .brand span {
    display: none;
  }
}
</style>
