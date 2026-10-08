<script setup lang="ts">
/** Bolinhas com as cores de uma graduação (com borda, para o branco aparecer). */
defineProps<{ colors: readonly string[]; size?: number }>()
</script>

<template>
  <span v-if="colors.length" class="swatches" aria-hidden="true">
    <span
      v-for="color in colors"
      :key="color"
      class="swatch"
      :style="{ background: color, width: `${size ?? 14}px`, height: `${size ?? 14}px` }"
    />
  </span>
</template>

<style scoped>
.swatches {
  display: inline-flex;
  flex-shrink: 0;
  gap: 3px;
}

.swatch {
  display: inline-block;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(27, 36, 48, 0.25);
}
</style>
