<script setup lang="ts">
import type { Genero, ObraDetalle } from '~/utils/types'
definePageMeta({ middleware: 'admin' })
const route = useRoute()
const slug = String(route.params.slug)
const { api, publicApi } = useApi()
const { isAdmin } = useAuth()
const toast = useToast()
useSeoMeta({ title: 'Gestionar capítulos', robots: 'noindex' })

const obra = ref<ObraDetalle | null>(null)
const generos = ref<Genero[]>([])
const editing = ref<ObraDetalle['capitulos'][number] | null>(null)
const form = reactive({ numero: '', titulo: '', volumen: '' })
const formObra = ref(false)
const error = ref('')

async function load() {
  try { obra.value = await publicApi<ObraDetalle>(`/mangas/${slug}`) } catch { error.value = 'Obra no encontrada' }
}
onMounted(async () => { generos.value = await publicApi<Genero[]>('/generos'); load() })

function edit(c: ObraDetalle['capitulos'][number]) {
  editing.value = c; Object.assign(form, { numero: String(c.numero), titulo: c.titulo ?? '', volumen: c.volumen != null ? String(c.volumen) : '' })
}
async function save() {
  try {
    await api(`/admin/capitulos/${editing.value!.id}`, { method: 'PATCH', body: {
      numero: Number(form.numero), titulo: form.titulo || undefined, volumen: form.volumen ? Number(form.volumen) : undefined } })
    toast.ok('Capítulo actualizado'); editing.value = null; load()
  } catch (e) { toast.error(apiError(e)) }
}
async function remove(c: ObraDetalle['capitulos'][number]) {
  if (!confirm(`¿Eliminar el capítulo ${fmtNum(c.numero)} con sus páginas y comentarios?`)) return
  try { await api(`/admin/capitulos/${c.id}`, { method: 'DELETE' }); toast.ok('Capítulo eliminado'); load() } catch (e) { toast.error(apiError(e)) }
}
</script>

<template>
  <div class="container-v py-6">
    <AdminNav />
    <p v-if="error" class="text-red-400">{{ error }}</p>
    <template v-else-if="obra">
      <div class="mb-5 flex flex-wrap items-center gap-3">
        <img v-if="obra.portadaUrl" :src="obra.portadaUrl" alt="" class="h-16 w-11 rounded object-cover" />
        <div class="min-w-0 flex-1">
          <h1 class="truncate font-display text-2xl">{{ obra.titulo }}</h1>
          <p class="text-xs text-muted">{{ TIPO_LABEL[obra.tipo] }} · {{ ESTADO_LABEL[obra.estado] }} · {{ obra.capitulos.length }} capítulos</p>
        </div>
        <button class="btn-ghost" @click="formObra = true"><AppIcon name="edit" class="size-4" />Editar obra</button>
        <NuxtLink :to="{ path: '/admin/subir', query: { obra: obra.id } }" class="btn-primary"><AppIcon name="upload" class="size-4" />Subir capítulo</NuxtLink>
      </div>

      <p v-if="!obra.capitulos.length" class="rounded-xl border border-dashed border-line p-10 text-center text-muted">Sin capítulos todavía.</p>
      <div v-else class="overflow-x-auto rounded-xl border border-line bg-surface">
        <table class="w-full text-sm">
          <thead class="border-b border-line text-left text-xs uppercase tracking-wide text-muted"><tr><th class="px-3 py-2">Cap.</th><th class="px-3 py-2">Título</th><th class="px-3 py-2">Vol.</th><th class="px-3 py-2">Vistas</th><th class="px-3 py-2">Publicado</th><th class="px-3 py-2" /></tr></thead>
          <tbody class="divide-y divide-line">
            <tr v-for="c in obra.capitulos" :key="c.id">
              <td class="px-3 py-2 font-medium tabular-nums"><NuxtLink :to="`/leer/${obra.slug}/${c.numero}`" class="hover:text-accent">{{ fmtNum(c.numero) }}</NuxtLink></td>
              <td class="max-w-48 truncate px-3 py-2 text-muted">{{ c.titulo ?? '—' }}</td>
              <td class="px-3 py-2 text-muted">{{ c.volumen ?? '—' }}</td>
              <td class="px-3 py-2 tabular-nums text-muted">{{ c.vistas }}</td>
              <td class="whitespace-nowrap px-3 py-2 text-muted">{{ timeAgo(c.publicadoEn) }}</td>
              <td class="whitespace-nowrap px-3 py-2 text-right">
                <button class="rounded-lg p-1.5 text-muted hover:text-fg" aria-label="Editar capítulo" @click="edit(c)"><AppIcon name="edit" class="size-4" /></button>
                <button v-if="isAdmin" class="rounded-lg p-1.5 text-muted hover:text-red-400" aria-label="Eliminar capítulo" @click="remove(c)"><AppIcon name="trash" class="size-4" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Teleport to="body">
        <div v-if="editing" class="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" @mousedown.self="editing = null">
          <form class="w-full max-w-sm space-y-3 rounded-2xl border border-line bg-surface p-5" @submit.prevent="save">
            <h2 class="font-display text-xl">Editar capítulo</h2>
            <label class="block text-xs text-muted">Número<input v-model="form.numero" type="number" step="0.01" min="0" class="input mt-1" required /></label>
            <label class="block text-xs text-muted">Título<input v-model="form.titulo" class="input mt-1" maxlength="255" /></label>
            <label class="block text-xs text-muted">Volumen<input v-model="form.volumen" type="number" min="0" class="input mt-1" /></label>
            <div class="flex justify-end gap-2"><button type="button" class="btn-ghost" @click="editing = null">Cancelar</button><button class="btn-primary">Guardar</button></div>
          </form>
        </div>
      </Teleport>
      <AdminObraForm v-if="formObra" :obra="obra" :generos="generos" @saved="formObra = false; load()" @close="formObra = false" />
    </template>
  </div>
</template>
