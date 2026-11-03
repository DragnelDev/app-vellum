<script setup lang="ts">
const props = defineProps<{ capituloId: number; padreId?: number; placeholder?: string; autofocus?: boolean }>()
const emit = defineEmits<{ sent: []; cancel: [] }>()
const { api } = useApi()
const toast = useToast()

interface Adjunto { tipo: 'imagen' | 'gif' | 'sticker'; url: string; ancho: number | null; alto: number | null }
const texto = ref('')
const adjuntos = ref<Adjunto[]>([])
const sending = ref(false)
const uploading = ref(false)
const ta = ref<HTMLTextAreaElement>()
const fileImg = ref<HTMLInputElement>()
const fileSticker = ref<HTMLInputElement>()
const QUICK = ['😂', '😭', '🔥', '❤️', '👍', '😮']

onMounted(() => props.autofocus && ta.value?.focus())
watch(texto, () => { const el = ta.value; if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 220) + 'px' } })

/** Envuelve la selección con marcas de formato (**negrita**, *cursiva*, ~~tachado~~, ||spoiler||). */
function wrap(open: string, close = open) {
  const el = ta.value!
  const { selectionStart: s, selectionEnd: e } = el
  const sel = texto.value.slice(s, e) || 'texto'
  texto.value = texto.value.slice(0, s) + open + sel + close + texto.value.slice(e)
  nextTick(() => { el.focus(); el.setSelectionRange(s + open.length, s + open.length + sel.length) })
}
const insert = (t: string) => { texto.value += t; ta.value?.focus() }

async function upload(ev: Event, tipo: 'imagen' | 'sticker') {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (adjuntos.value.length >= 4) return toast.error('Máximo 4 adjuntos')
  uploading.value = true
  try {
    const fd = new FormData(); fd.append('tipo', tipo); fd.append('archivo', file)
    adjuntos.value.push(await api<Adjunto>('/comentarios/media', { method: 'POST', body: fd }))
  } catch (e) { toast.error(apiError(e, 'No se pudo subir el archivo')) } finally { uploading.value = false }
}

async function send() {
  if (sending.value || (!texto.value.trim() && !adjuntos.value.length)) return
  sending.value = true
  try {
    await api(`/capitulos/${props.capituloId}/comentarios`, { method: 'POST', body: { contenido: texto.value, padreId: props.padreId, multimedia: adjuntos.value } })
    texto.value = ''; adjuntos.value = []; emit('sent')
  } catch (e) { toast.error(apiError(e, 'No se pudo publicar')) } finally { sending.value = false }
}
</script>

<template>
  <form class="rounded-xl border border-line bg-surface p-2.5 focus-within:border-accent" @submit.prevent="send">
    <textarea ref="ta" v-model="texto" rows="2" maxlength="2000" :placeholder="placeholder ?? 'Escribe un comentario…'" aria-label="Comentario"
      class="w-full resize-none bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted" @keydown.ctrl.enter.prevent="send" @keydown.meta.enter.prevent="send" />

    <div v-if="adjuntos.length" class="mb-2 flex flex-wrap gap-2">
      <div v-for="(a, i) in adjuntos" :key="a.url" class="relative">
        <img :src="a.url" alt="Adjunto" class="h-20 rounded-lg border border-line object-cover" :class="a.tipo === 'sticker' ? 'bg-surface-2 p-1' : ''" />
        <button type="button" class="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-black/80 text-white" aria-label="Quitar adjunto" @click="adjuntos.splice(i, 1)"><AppIcon name="close" class="size-3" /></button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-1 text-muted">
      <button type="button" class="rounded-md px-2 py-1 text-sm font-bold hover:bg-surface-2 hover:text-fg" title="Negrita" @click="wrap('**')">B</button>
      <button type="button" class="rounded-md px-2 py-1 text-sm italic hover:bg-surface-2 hover:text-fg" title="Cursiva" @click="wrap('*')">I</button>
      <button type="button" class="rounded-md px-2 py-1 text-sm line-through hover:bg-surface-2 hover:text-fg" title="Tachado" @click="wrap('~~')">S</button>
      <button type="button" class="rounded-md px-2 py-1 text-xs hover:bg-surface-2 hover:text-fg" title="Spoiler" @click="wrap('||')">Spoiler</button>
      <span class="mx-1 h-4 w-px bg-line" />
      <button type="button" class="rounded-md p-1.5 hover:bg-surface-2 hover:text-fg" title="Imagen, meme o GIF" :disabled="uploading" @click="fileImg?.click()"><AppIcon name="image" class="size-4" /></button>
      <button type="button" class="rounded-md px-2 py-1 text-xs hover:bg-surface-2 hover:text-fg" title="Sticker" :disabled="uploading" @click="fileSticker?.click()">Sticker</button>
      <input ref="fileImg" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" class="hidden" @change="upload($event, 'imagen')" />
      <input ref="fileSticker" type="file" accept="image/png,image/webp,image/gif" class="hidden" @change="upload($event, 'sticker')" />
      <span class="mx-1 hidden h-4 w-px bg-line sm:block" />
      <span class="hidden gap-0.5 sm:flex"><button v-for="e in QUICK" :key="e" type="button" class="rounded-md px-1 hover:bg-surface-2" @click="insert(e)">{{ e }}</button></span>

      <span class="ml-auto flex items-center gap-2">
        <span v-if="uploading" class="text-xs">Subiendo…</span>
        <span class="text-xs tabular-nums">{{ texto.length }}/2000</span>
        <button v-if="padreId" type="button" class="btn-ghost !px-3 !py-1.5" @click="emit('cancel')">Cancelar</button>
        <button class="btn-primary !px-4 !py-1.5" :disabled="sending || uploading || (!texto.trim() && !adjuntos.length)">{{ sending ? 'Enviando…' : padreId ? 'Responder' : 'Comentar' }}</button>
      </span>
    </div>
  </form>
</template>
