<script setup lang="ts">
const props = defineProps<{ capituloId: number }>()
const { api, baseURL } = useApi()
const { requireAuth, isLogged } = useAuth()
const toast = useToast()

const EMOJIS = ['🔥', '😍', '😂', '😮', '😭', '😡']
const conteos = ref<Record<string, number>>(Object.fromEntries(EMOJIS.map((e) => [e, 0])))
const mia = ref<string | null>(null)

let es: EventSource | undefined
async function loadMine() {
  if (!isLogged.value) { mia.value = null; return }
  try { mia.value = (await api<{ mia: string | null }>(`/capitulos/${props.capituloId}/reacciones`)).mia } catch { /* noop */ }
}

onMounted(() => {
  // Contadores en vivo vía Server-Sent Events (el primer mensaje trae el estado actual)
  es = new EventSource(`${baseURL}/capitulos/${props.capituloId}/reacciones/stream`)
  es.onmessage = (e) => { try { conteos.value = { ...conteos.value, ...JSON.parse(e.data) } } catch { /* noop */ } }
})
onBeforeUnmount(() => es?.close())
watch(isLogged, loadMine, { immediate: true })

const busy = ref(false)
function react(emoji: string) {
  requireAuth(async () => {
    if (busy.value) return
    busy.value = true
    const prev = { c: { ...conteos.value }, m: mia.value }
    // actualización optimista
    if (mia.value) conteos.value[mia.value] = Math.max(0, (conteos.value[mia.value] ?? 1) - 1)
    if (mia.value === emoji) mia.value = null
    else { conteos.value[emoji] = (conteos.value[emoji] ?? 0) + 1; mia.value = emoji }
    try {
      const r = await api<{ conteos: Record<string, number>; mia: string | null }>(`/capitulos/${props.capituloId}/reacciones`, { method: 'PUT', body: { emoji } })
      conteos.value = r.conteos; mia.value = r.mia
    } catch (e) { conteos.value = prev.c; mia.value = prev.m; toast.error(apiError(e)) } finally { busy.value = false }
  })
}
const total = computed(() => Object.values(conteos.value).reduce((a, b) => a + b, 0))
</script>

<template>
  <section aria-label="Reacciones del capítulo" class="rounded-2xl border border-line bg-surface p-3">
    <p class="mb-2 text-center text-xs text-muted">{{ total ? `${total} reacciones` : '¿Qué te pareció el capítulo?' }}</p>
    <div class="flex justify-center gap-1.5 sm:gap-2">
      <button v-for="e in EMOJIS" :key="e" :aria-pressed="mia === e" :aria-label="`Reaccionar ${e}`"
        class="flex min-w-12 flex-col items-center rounded-xl border px-2 py-1.5 transition active:scale-90"
        :class="mia === e ? 'border-accent bg-accent/15' : 'border-transparent hover:bg-surface-2'" @click="react(e)">
        <span class="text-2xl leading-none">{{ e }}</span>
        <span class="mt-1 text-xs tabular-nums" :class="mia === e ? 'font-semibold text-accent' : 'text-muted'">{{ conteos[e] ?? 0 }}</span>
      </button>
    </div>
  </section>
</template>
