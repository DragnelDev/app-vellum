<script setup lang="ts">
import type { Usuario } from '~/composables/useAuth'
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Mi perfil', robots: 'noindex' })

const { api } = useApi()
const { user } = useAuth()
const toast = useToast()
const tab = ref<'cuenta' | 'historial'>('cuenta')
const prefsOpen = ref(false)

// Avatar
const avatarBusy = ref(false)
async function onAvatar(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]; input.value = ''
  if (!file) return
  avatarBusy.value = true
  try {
    const fd = new FormData(); fd.append('archivo', file)
    user.value = await api<Usuario>('/usuarios/me/avatar', { method: 'POST', body: fd })
    toast.ok('Avatar actualizado')
  } catch (err) { toast.error(apiError(err, 'No se pudo subir la imagen')) } finally { avatarBusy.value = false }
}

// Email
const em = reactive({ email: '', password: '' })
async function saveEmail() {
  try { user.value = await api<Usuario>('/usuarios/me/email', { method: 'PATCH', body: em }); em.password = ''; toast.ok('Correo actualizado') }
  catch (err) { toast.error(apiError(err)) }
}
// Password
const pw = reactive({ actual: '', nueva: '', repetir: '' })
async function savePassword() {
  if (pw.nueva !== pw.repetir) return toast.error('Las contraseñas nuevas no coinciden')
  try { await api('/usuarios/me/password', { method: 'PATCH', body: { actual: pw.actual, nueva: pw.nueva } }); Object.assign(pw, { actual: '', nueva: '', repetir: '' }); toast.ok('Contraseña cambiada') }
  catch (err) { toast.error(apiError(err)) }
}

// Historial
interface Item { mangaId: number; titulo: string; slug: string; portadaUrl: string | null; numero: number; pagina: number; actualizadoEn: string }
const items = ref<Item[]>([]); const total = ref(0); const page = ref(1); const loading = ref(false)
async function loadHist(reset = true) {
  loading.value = true
  try {
    const p = reset ? 1 : page.value + 1
    const r = await api<{ items: Item[]; total: number }>('/usuarios/me/historial', { query: { page: p } })
    items.value = reset ? r.items : [...items.value, ...r.items]; total.value = r.total; page.value = p
  } finally { loading.value = false }
}
watch(tab, (t) => t === 'historial' && !items.value.length && loadHist(), { immediate: false })
async function quitar(i: Item) { await api(`/usuarios/me/historial/${i.mangaId}`, { method: 'DELETE' }); items.value = items.value.filter((x) => x !== i); total.value-- }
async function vaciar() { if (!confirm('¿Borrar todo tu historial de lectura?')) return; await api('/usuarios/me/historial', { method: 'DELETE' }); items.value = []; total.value = 0 }
</script>

<template>
  <div v-if="user" class="container-v max-w-2xl py-6">
    <div class="mb-6 flex items-center gap-4">
      <label class="group relative size-20 shrink-0 cursor-pointer overflow-hidden rounded-full border border-line bg-surface-2" title="Cambiar avatar">
        <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="Tu avatar" class="size-full object-cover" />
        <span v-else class="grid size-full place-items-center text-3xl font-bold text-muted">{{ user.username[0]?.toUpperCase() }}</span>
        <span class="absolute inset-0 grid place-items-center bg-black/55 text-xs text-white opacity-0 transition group-hover:opacity-100">{{ avatarBusy ? 'Subiendo…' : 'Cambiar' }}</span>
        <input type="file" accept="image/*" class="sr-only" :disabled="avatarBusy" @change="onAvatar" />
      </label>
      <div><h1 class="font-display text-3xl">{{ user.username }}</h1><p class="text-sm text-muted">{{ user.email }} · {{ user.rol }}</p></div>
    </div>

    <div class="mb-5 flex gap-2">
      <button class="chip" :aria-pressed="tab === 'cuenta'" @click="tab = 'cuenta'">Cuenta</button>
      <button class="chip" :aria-pressed="tab === 'historial'" @click="tab = 'historial'">Historial de lectura</button>
    </div>

    <div v-show="tab === 'cuenta'" class="space-y-6">
      <section class="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <h2 class="font-medium">Lectura</h2>
        <button class="btn-ghost" @click="prefsOpen = true">Abrir preferencias del lector</button>
        <p class="text-xs text-muted">Colores, brillo, ancho, modo de lectura y gestos se guardan en tu cuenta.</p>
      </section>

      <form class="space-y-3 rounded-2xl border border-line bg-surface p-4" @submit.prevent="saveEmail">
        <h2 class="font-medium">Cambiar correo</h2>
        <input v-model="em.email" type="email" class="input" placeholder="Nuevo correo" required autocomplete="email" />
        <input v-model="em.password" type="password" class="input" placeholder="Contraseña actual" required autocomplete="current-password" />
        <button class="btn-primary">Guardar correo</button>
      </form>

      <form class="space-y-3 rounded-2xl border border-line bg-surface p-4" @submit.prevent="savePassword">
        <h2 class="font-medium">Cambiar contraseña</h2>
        <input v-model="pw.actual" type="password" class="input" placeholder="Contraseña actual" required autocomplete="current-password" />
        <input v-model="pw.nueva" type="password" class="input" placeholder="Nueva contraseña (mín. 8)" minlength="8" required autocomplete="new-password" />
        <input v-model="pw.repetir" type="password" class="input" placeholder="Repite la nueva" minlength="8" required autocomplete="new-password" />
        <button class="btn-primary">Cambiar contraseña</button>
      </form>
    </div>

    <div v-show="tab === 'historial'">
      <div class="mb-3 flex items-center justify-between"><p class="text-sm text-muted">{{ total }} obra{{ total === 1 ? '' : 's' }}</p><button v-if="items.length" class="text-sm text-red-400 hover:underline" @click="vaciar">Vaciar historial</button></div>
      <p v-if="!items.length && !loading" class="rounded-xl border border-dashed border-line p-8 text-center text-muted">Aún no has leído nada.</p>
      <ul class="space-y-2">
        <li v-for="i in items" :key="i.mangaId" class="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5">
          <img v-if="i.portadaUrl" :src="i.portadaUrl" alt="" class="h-16 w-11 rounded object-cover" loading="lazy" />
          <NuxtLink :to="`/leer/${i.slug}/${i.numero}`" class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ i.titulo }}</p>
            <p class="text-xs text-muted">Cap. {{ fmtNum(i.numero) }} · pág. {{ i.pagina }} · {{ timeAgo(i.actualizadoEn) }}</p>
          </NuxtLink>
          <button class="rounded-lg p-2 text-muted hover:text-red-400" aria-label="Quitar del historial" @click="quitar(i)"><AppIcon name="trash" class="size-4" /></button>
        </li>
      </ul>
      <div v-if="items.length < total" class="mt-4 text-center"><button class="btn-ghost" :disabled="loading" @click="loadHist(false)">Ver más</button></div>
    </div>

    <ReaderPrefsPanel :open="prefsOpen" @close="prefsOpen = false" />
  </div>
</template>
