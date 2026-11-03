<script setup lang="ts">
const { toasts } = useToast()
</script>
<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
    <div v-for="t in toasts" :key="t.id"
      class="pointer-events-auto max-w-sm rounded-xl border px-4 py-2.5 text-sm shadow-xl"
      :class="t.type === 'error' ? 'border-red-500/40 bg-red-950 text-red-100' : 'border-line bg-surface-2 text-fg'">
      {{ t.text }}
    </div>
  </div>
</template>
