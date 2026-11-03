<script setup lang="ts">
import type { Comentario } from '~/utils/types'
const props = defineProps<{ capituloId: number }>()
const { api } = useApi()
const { isLogged, modal } = useAuth()

const items = ref<Comentario[]>([])
const page = ref(1)
const total = ref(0)
const totalComentarios = ref(0)
const pageSize = ref(20)
const orden = ref<'recientes' | 'populares' | 'antiguos'>('recientes')
const loading = ref(false)

async function load(reset = true) {
  if (loading.value) return
  loading.value = true
  try {
    const p = reset ? 1 : page.value + 1
    const r = await api<{ items: Comentario[]; total: number; totalComentarios: number; pageSize: number }>(
      `/capitulos/${props.capituloId}/comentarios`, { query: { page: p, orden: orden.value } })
    items.value = reset ? r.items : [...items.value, ...r.items]
    page.value = p; total.value = r.total; totalComentarios.value = r.totalComentarios; pageSize.value = r.pageSize
  } finally { loading.value = false }
}
// Refresca (conservando páginas ya cargadas hasta la primera) tras publicar/eliminar
const refresh = () => load(true)

onMounted(() => load())
watch(orden, () => load())
watch(isLogged, () => load()) // para "me gusta" propios al iniciar sesión
</script>

<template>
  <section aria-labelledby="h-com" class="space-y-5">
    <div class="flex items-center justify-between">
      <h2 id="h-com" class="font-display text-xl">Comentarios <span class="text-base text-muted">({{ totalComentarios }})</span></h2>
      <select v-model="orden" class="input !w-auto !py-1.5" aria-label="Ordenar comentarios">
        <option value="recientes">Recientes</option><option value="populares">Populares</option><option value="antiguos">Antiguos</option>
      </select>
    </div>

    <CommentComposer v-if="isLogged" :capitulo-id="capituloId" @sent="refresh" />
    <button v-else class="w-full rounded-xl border border-dashed border-line p-4 text-sm text-muted hover:border-accent hover:text-fg" @click="modal = 'login'">
      Inicia sesión para comentar
    </button>

    <p v-if="!items.length && !loading" class="py-6 text-center text-sm text-muted">Sé el primero en comentar.</p>
    <div class="space-y-5">
      <CommentItem v-for="c in items" :key="c.id" :c="c" :capitulo-id="capituloId" @refresh="refresh" />
    </div>
    <div v-if="items.length < total" class="text-center"><button class="btn-ghost" :disabled="loading" @click="load(false)">{{ loading ? 'Cargando…' : 'Ver más comentarios' }}</button></div>
  </section>
</template>
