<script setup lang="ts">
import type { EstadoLectura } from '~/utils/types'
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Mi biblioteca', robots: 'noindex' })

const { api } = useApi()
interface Item { id: number; titulo: string; slug: string; portadaUrl: string | null; tipo: string; estado: EstadoLectura; ultimoCapitulo: number | null }
const tab = ref<EstadoLectura | 'todos'>('todos')
const items = ref<Item[]>([])
const loading = ref(true)
onMounted(async () => {
  try { items.value = await api<Item[]>('/biblioteca') } finally { loading.value = false }
})
const filtered = computed(() => tab.value === 'todos' ? items.value : items.value.filter((i) => i.estado === tab.value))
</script>

<template>
  <div class="container-v py-6">
    <h1 class="mb-4 font-display text-3xl">Mi biblioteca</h1>
    <div class="mb-5 flex gap-2">
      <button class="chip" :aria-pressed="tab === 'todos'" @click="tab = 'todos'">Todos ({{ items.length }})</button>
      <button v-for="(l, k) in ESTADO_LECTURA_LABEL" :key="k" class="chip" :aria-pressed="tab === k" @click="tab = k as EstadoLectura">
        {{ l }} ({{ items.filter((i) => i.estado === k).length }})
      </button>
    </div>
    <p v-if="loading" class="text-muted">Cargando…</p>
    <p v-else-if="!filtered.length" class="rounded-xl border border-dashed border-line p-10 text-center text-muted">
      Nada por aquí todavía. Explora el <NuxtLink to="/catalogo" class="text-accent hover:underline">catálogo</NuxtLink> y guarda tus obras.
    </p>
    <div v-else class="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      <MangaCard v-for="i in filtered" :key="i.id" :manga="i" />
    </div>
  </div>
</template>
