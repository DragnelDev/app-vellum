<script setup lang="ts">
import type { Genero } from '~/utils/types'
definePageMeta({ middleware: 'admin' })
useSeoMeta({ title: 'Géneros', robots: 'noindex' })
const { api, publicApi } = useApi()
const { isAdmin } = useAuth()
const toast = useToast()
const items = ref<Genero[]>([])
const nuevo = ref('')
const editId = ref<number | null>(null)
const editNombre = ref('')

const load = async () => (items.value = await publicApi<Genero[]>('/generos'))
onMounted(load)

async function add() {
  if (!nuevo.value.trim()) return
  try { await api('/admin/generos', { method: 'POST', body: { nombre: nuevo.value } }); nuevo.value = ''; load() } catch (e) { toast.error(apiError(e)) }
}
async function rename(g: Genero) {
  try { await api(`/admin/generos/${g.id}`, { method: 'PATCH', body: { nombre: editNombre.value } }); editId.value = null; load() } catch (e) { toast.error(apiError(e, 'Ya existe un género con ese nombre')) }
}
async function remove(g: Genero) {
  if (!confirm(`¿Eliminar "${g.nombre}"? Se quitará de todas las obras.`)) return
  try { await api(`/admin/generos/${g.id}`, { method: 'DELETE' }); load() } catch (e) { toast.error(apiError(e)) }
}
</script>
<template>
  <div class="container-v max-w-xl py-6">
    <AdminNav />
    <h1 class="mb-4 font-display text-3xl">Géneros <span class="text-base text-muted">({{ items.length }})</span></h1>
    <form class="mb-4 flex gap-2" @submit.prevent="add"><input v-model="nuevo" class="input" placeholder="Nuevo género…" maxlength="60" /><button class="btn-primary">Añadir</button></form>
    <ul class="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      <li v-for="g in items" :key="g.id" class="flex items-center gap-2 px-3 py-2">
        <template v-if="editId === g.id">
          <input v-model="editNombre" class="input !py-1.5" @keydown.enter.prevent="rename(g)" @keydown.esc="editId = null" />
          <button class="btn-primary !px-3 !py-1.5 text-xs" @click="rename(g)">Guardar</button>
        </template>
        <template v-else>
          <span class="flex-1 text-sm">{{ g.nombre }} <small class="text-muted">/{{ g.slug }}</small></span>
          <template v-if="isAdmin">
            <button class="rounded-lg p-1.5 text-muted hover:text-fg" aria-label="Renombrar" @click="editId = g.id; editNombre = g.nombre"><AppIcon name="edit" class="size-4" /></button>
            <button class="rounded-lg p-1.5 text-muted hover:text-red-400" aria-label="Eliminar" @click="remove(g)"><AppIcon name="trash" class="size-4" /></button>
          </template>
        </template>
      </li>
    </ul>
  </div>
</template>
