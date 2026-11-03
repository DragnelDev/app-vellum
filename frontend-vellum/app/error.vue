<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number; statusMessage?: string } }>()
useSeoMeta({ title: String(props.error.statusCode), robots: 'noindex' })
</script>
<template>
  <div class="grid min-h-dvh place-items-center bg-bg p-6 text-center text-fg">
    <div>
      <p class="font-display text-7xl text-accent">{{ error.statusCode }}</p>
      <p class="mt-2 text-muted">{{ error.statusMessage || 'Algo salió mal' }}</p>
      <button class="btn-primary mt-6" @click="clearError({ redirect: '/' })">Volver al inicio</button>
    </div>
  </div>
</template>
