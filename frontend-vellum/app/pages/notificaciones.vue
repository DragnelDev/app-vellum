<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Notificaciones', robots: 'noindex' })
const { api } = useApi()
const count = useState('notif:count', () => 0)
interface N { id: number; tipo: string; titulo: string; cuerpo: string; url: string | null; leida: boolean; creadoEn: string }
const items = ref<N[]>([]); const total = ref(0); const page = ref(1); const loading = ref(true)

async function load(reset = true) {
  loading.value = true
  try {
    const p = reset ? 1 : page.value + 1
    const r = await api<{ items: N[]; total: number; noLeidas: number }>('/notificaciones', { query: { page: p } })
    items.value = reset ? r.items : [...items.value, ...r.items]; total.value = r.total; page.value = p; count.value = r.noLeidas
  } finally { loading.value = false }
}
onMounted(() => load())

async function open(n: N) {
  if (!n.leida) { n.leida = true; count.value = Math.max(0, count.value - 1); api(`/notificaciones/${n.id}/leer`, { method: 'PATCH' }).catch(() => {}) }
  if (n.url) {
    const [path, hash] = n.url.split('#')
    await navigateTo({ path, hash: hash ? `#${hash}` : undefined })
  }
}
async function readAll() { await api('/notificaciones/leer-todas', { method: 'PATCH' }); items.value.forEach((n) => (n.leida = true)); count.value = 0 }
async function remove(n: N) { await api(`/notificaciones/${n.id}`, { method: 'DELETE' }); items.value = items.value.filter((x) => x !== n); if (!n.leida) count.value = Math.max(0, count.value - 1) }
const ICON: Record<string, string> = { nuevo_capitulo: 'book', respuesta: 'reply', sistema: 'bell' }
</script>
<template>
  <div class="container-v max-w-2xl py-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="font-display text-3xl">Notificaciones</h1>
      <button v-if="count" class="btn-ghost !py-1.5 text-xs" @click="readAll"><AppIcon name="check" class="size-4" />Marcar todas como leídas</button>
    </div>
    <p v-if="!items.length && !loading" class="rounded-xl border border-dashed border-line p-10 text-center text-muted">No tienes notificaciones. Guarda obras en tu biblioteca para enterarte de los nuevos capítulos.</p>
    <ul class="space-y-2">
      <li v-for="n in items" :key="n.id" class="flex items-start gap-3 rounded-xl border p-3 transition" :class="n.leida ? 'border-line bg-surface' : 'border-accent/50 bg-accent/10'">
        <AppIcon :name="ICON[n.tipo] ?? 'bell'" class="mt-0.5 size-5 shrink-0" :class="n.leida ? 'text-muted' : 'text-accent'" />
        <button class="min-w-0 flex-1 text-left" @click="open(n)">
          <p class="truncate text-sm font-medium">{{ n.titulo }}</p>
          <p v-if="n.cuerpo" class="line-clamp-2 text-xs text-muted">{{ n.cuerpo }}</p>
          <p class="mt-1 text-[11px] text-muted">{{ timeAgo(n.creadoEn) }}</p>
        </button>
        <button class="rounded-lg p-1.5 text-muted hover:text-red-400" aria-label="Eliminar notificación" @click="remove(n)"><AppIcon name="close" class="size-4" /></button>
      </li>
    </ul>
    <div v-if="items.length < total" class="mt-4 text-center"><button class="btn-ghost" :disabled="loading" @click="load(false)">Ver más</button></div>
  </div>
</template>
