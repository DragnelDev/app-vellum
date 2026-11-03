<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeoMeta({ title: 'Moderación', robots: 'noindex' })
const { api } = useApi()
const toast = useToast()

interface Reporte { comentarioId: number; contenido: string; eliminado: boolean; autorId: string; autor: string; autorActivo: boolean; slug: string; numero: number; reportes: number; motivos: string[]; ultimo: string }
const estado = ref<'pendiente' | 'resuelto' | 'descartado'>('pendiente')
const reportes = ref<Reporte[]>([])
const palabras = ref<{ id: number; palabra: string }[]>([])
const nueva = ref('')
const loading = ref(true)

async function load() {
  loading.value = true
  try { reportes.value = await api<Reporte[]>('/admin/reportes', { query: { estado: estado.value } }) } finally { loading.value = false }
}
watch(estado, load)
onMounted(async () => { load(); palabras.value = await api('/admin/palabras-prohibidas') })

async function resolver(r: Reporte, accion: 'descartar' | 'eliminar' | 'eliminar_y_bloquear') {
  if (accion === 'eliminar_y_bloquear' && !confirm(`¿Eliminar el comentario y bloquear a ${r.autor}?`)) return
  try { await api(`/admin/reportes/comentario/${r.comentarioId}/resolver`, { method: 'POST', body: { accion } }); toast.ok('Hecho'); load() } catch (e) { toast.error(apiError(e)) }
}
async function addPalabra() {
  if (!nueva.value.trim()) return
  try { palabras.value = await api('/admin/palabras-prohibidas', { method: 'POST', body: { palabra: nueva.value } }); nueva.value = '' } catch (e) { toast.error(apiError(e)) }
}
async function delPalabra(id: number) { await api(`/admin/palabras-prohibidas/${id}`, { method: 'DELETE' }); palabras.value = palabras.value.filter((p) => p.id !== id) }
</script>
<template>
  <div class="container-v py-6">
    <AdminNav />
    <h1 class="mb-4 font-display text-3xl">Moderación</h1>

    <section class="mb-10">
      <div class="mb-3 flex items-center gap-2">
        <h2 class="font-medium">Comentarios reportados</h2>
        <div class="ml-auto flex gap-2"><button v-for="e in (['pendiente', 'resuelto', 'descartado'] as const)" :key="e" class="chip capitalize" :aria-pressed="estado === e" @click="estado = e">{{ e }}s</button></div>
      </div>
      <p v-if="!loading && !reportes.length" class="rounded-xl border border-dashed border-line p-8 text-center text-muted">No hay reportes {{ estado }}s.</p>
      <ul class="space-y-3">
        <li v-for="r in reportes" :key="r.comentarioId" class="rounded-xl border border-line bg-surface p-4">
          <div class="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <b class="text-sm text-fg">{{ r.autor }}</b><span v-if="!r.autorActivo" class="rounded bg-red-500/20 px-1.5 text-red-400">bloqueado</span>
            <span>· {{ r.reportes }} reporte{{ r.reportes === 1 ? '' : 's' }}</span><span v-for="m in r.motivos" :key="m" class="chip !py-0">{{ m }}</span>
            <NuxtLink :to="`/leer/${r.slug}/${r.numero}#c-${r.comentarioId}`" class="ml-auto text-accent hover:underline">Ver en contexto →</NuxtLink>
          </div>
          <p class="whitespace-pre-line break-words text-sm" :class="r.eliminado ? 'italic text-muted' : ''">{{ r.eliminado ? '[comentario eliminado]' : r.contenido || '[solo adjuntos]' }}</p>
          <div v-if="estado === 'pendiente'" class="mt-3 flex flex-wrap gap-2">
            <button class="btn-ghost !py-1.5 text-xs" @click="resolver(r, 'descartar')">Descartar</button>
            <button v-if="!r.eliminado" class="btn-primary !py-1.5 text-xs" @click="resolver(r, 'eliminar')">Eliminar comentario</button>
            <button class="btn-ghost !py-1.5 text-xs text-red-400" @click="resolver(r, 'eliminar_y_bloquear')">Eliminar y bloquear autor</button>
          </div>
        </li>
      </ul>
    </section>

    <section>
      <h2 class="mb-1 font-medium">Palabras prohibidas</h2>
      <p class="mb-3 text-xs text-muted">Los comentarios que las contengan (palabra completa, sin distinguir acentos ni mayúsculas) se rechazan.</p>
      <form class="mb-3 flex max-w-md gap-2" @submit.prevent="addPalabra"><input v-model="nueva" class="input" placeholder="Palabra o frase…" maxlength="80" /><button class="btn-primary">Añadir</button></form>
      <div class="flex flex-wrap gap-2">
        <span v-for="p in palabras" :key="p.id" class="chip gap-1.5">{{ p.palabra }}<button class="text-muted hover:text-red-400" :aria-label="`Quitar ${p.palabra}`" @click="delPalabra(p.id)"><AppIcon name="close" class="size-3" /></button></span>
        <span v-if="!palabras.length" class="text-sm text-muted">Lista vacía.</span>
      </div>
    </section>
  </div>
</template>
