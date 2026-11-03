<script setup lang="ts">
defineProps<{ manga: { slug: string; titulo: string; portadaUrl: string | null; tipo: string; ultimoCapitulo?: number | null }; badge?: string }>()
</script>
<template>
  <NuxtLink :to="`/obra/${manga.slug}`" class="group block">
    <div class="relative aspect-[2/3] overflow-hidden rounded-xl border border-line bg-surface-2">
      <img v-if="manga.portadaUrl" :src="manga.portadaUrl" :alt="`Portada de ${manga.titulo}`" loading="lazy" decoding="async"
        class="size-full object-cover transition duration-300 group-hover:scale-[1.04]" />
      <div v-else class="grid size-full place-items-center p-3 text-center font-display text-lg text-muted">{{ manga.titulo }}</div>
      <span class="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur">{{ TIPO_LABEL[manga.tipo] ?? manga.tipo }}</span>
      <span v-if="badge ?? manga.ultimoCapitulo" class="absolute bottom-2 right-2 rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-on-accent">
        {{ badge ?? `Cap. ${fmtNum(manga.ultimoCapitulo!)}` }}
      </span>
    </div>
    <h3 class="mt-2 line-clamp-2 text-sm font-medium leading-snug group-hover:text-accent">{{ manga.titulo }}</h3>
  </NuxtLink>
</template>
