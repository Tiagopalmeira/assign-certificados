<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from './BaseModal.vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const request = computed(() => ui.confirmation)
</script>

<template>
  <BaseModal :open="Boolean(request)" :title="request?.title ?? ''" size="sm" @close="ui.answer(false)">
    <p>{{ request?.message }}</p>
    <template #footer>
      <button type="button" class="btn btn--secondary" :autofocus="request?.danger" @click="ui.answer(false)">
        {{ request?.cancelLabel ?? 'Cancelar' }}
      </button>
      <button
        type="button"
        class="btn"
        :class="request?.danger ? 'btn--danger-solid' : 'btn--primary'"
        :autofocus="!request?.danger"
        @click="ui.answer(true)"
      >
        {{ request?.confirmLabel }}
      </button>
    </template>
  </BaseModal>
</template>
