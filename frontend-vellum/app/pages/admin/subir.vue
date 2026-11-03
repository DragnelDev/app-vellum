<script setup lang="ts">
import type { MangaResumen, Paginado } from "~/utils/types";
definePageMeta({ middleware: "admin" });
useSeoMeta({ title: "Subir capítulo", robots: "noindex" });

const route = useRoute();
const { api, publicApi, baseURL } = useApi();
const { token } = useAuth();
const toast = useToast();

const q = ref("");
const obras = ref<MangaResumen[]>([]);
const obraId = ref<number | null>(
  route.query.obra ? Number(route.query.obra) : null,
);
const form = reactive({
  numero: "",
  volumen: "",
  titulo: "",
  reemplazar: false,
  contenido: "",
});
const zip = ref<File | null>(null);
const dragging = ref(false);
const progress = ref(0);
const phase = ref<"idle" | "uploading" | "processing">("idle");
const result = ref<{ id: number; numero: number; paginas?: number } | null>(
  null,
);

const obra = computed(() => obras.value.find((o) => o.id === obraId.value));
const isNovel = computed(() => obra.value?.tipo === "novela");

async function loadObras() {
  const r = await publicApi<Paginado<MangaResumen>>("/mangas", {
    query: { q: q.value || undefined, orden: "actualizados", limit: 30 },
  });
  // conserva la obra seleccionada aunque no coincida con la búsqueda
  if (obraId.value && !r.items.some((o) => o.id === obraId.value)) {
    const sel = obras.value.find((o) => o.id === obraId.value);
    if (sel) r.items.unshift(sel);
  }
  obras.value = r.items;
}
let t: ReturnType<typeof setTimeout>;
watch(q, () => {
  clearTimeout(t);
  t = setTimeout(loadObras, 250);
});
onMounted(async () => {
  await loadObras();
  // si llega con ?obra=ID y no estaba en los 30 primeros
  if (obraId.value && !obras.value.some((o) => o.id === obraId.value))
    obraId.value = null;
});

function setFile(f?: File | null) {
  if (!f) return;
  if (!/\.zip$/i.test(f.name))
    return toast.error("Solo se aceptan archivos .zip");
  zip.value = f;
}
const onDrop = (e: DragEvent) => {
  dragging.value = false;
  setFile(e.dataTransfer?.files?.[0]);
};

function uploadZip(): Promise<{ id: number; numero: number; paginas: number }> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("mangaId", String(obraId.value));
    fd.append("numero", form.numero);
    if (form.volumen) fd.append("volumen", form.volumen);
    if (form.titulo) fd.append("titulo", form.titulo);
    fd.append("reemplazar", String(form.reemplazar));
    fd.append("archivo", zip.value!);

    // XHR para tener progreso de subida real
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${baseURL}/admin/capitulos/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token.value}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        progress.value = Math.round((e.loaded / e.total) * 100);
    };
    xhr.upload.onload = () => {
      phase.value = "processing";
    }; // el servidor convierte a WebP y sube a R2
    xhr.onload = () => {
      let body: any = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* noop */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else
        reject(
          new Error(
            Array.isArray(body.message)
              ? body.message.join(". ")
              : body.message || `Error ${xhr.status}`,
          ),
        );
    };
    xhr.onerror = () => reject(new Error("Error de red durante la subida"));
    xhr.send(fd);
  });
}

async function submit() {
  if (!obraId.value) return toast.error("Elige una obra");
  result.value = null;
  progress.value = 0;
  phase.value = "uploading";
  try {
    if (isNovel.value && form.contenido.trim()) {
      phase.value = "processing";
      result.value = await api("/admin/capitulos/texto", {
        method: "POST",
        body: {
          mangaId: obraId.value,
          numero: Number(form.numero),
          volumen: form.volumen ? Number(form.volumen) : undefined,
          titulo: form.titulo || undefined,
          reemplazar: form.reemplazar,
          contenido: form.contenido,
        },
      });
    } else {
      if (!zip.value) {
        phase.value = "idle";
        return toast.error("Adjunta un archivo .zip");
      }
      result.value = await uploadZip();
    }
    toast.ok("Capítulo publicado");
    zip.value = null;
    form.numero = String(Number(form.numero) + 1);
    form.titulo = "";
    form.contenido = "";
    form.reemplazar = false;
  } catch (e) {
    toast.error((e as Error).message || apiError(e));
  } finally {
    phase.value = "idle";
  }
}
</script>

<template>
  <div class="container-v max-w-2xl py-6">
    <AdminNav />
    <h1 class="mb-5 font-display text-3xl">Subir capítulo</h1>

    <form class="space-y-5" @submit.prevent="submit">
      <section class="space-y-2">
        <label class="text-xs uppercase tracking-wide text-muted">Obra</label>
        <input
          v-model="q"
          type="search"
          class="input"
          placeholder="Filtrar obras…"
        />
        <select v-model="obraId" class="input" required size="5">
          <option v-for="o in obras" :key="o.id" :value="o.id">
            {{ o.titulo }} · {{ TIPO_LABEL[o.tipo] }}
          </option>
        </select>
      </section>

      <section class="grid grid-cols-2 gap-3">
        <label class="block"
          ><span class="mb-1 block text-xs uppercase tracking-wide text-muted"
            >Nº de capítulo</span
          >
          <input
            v-model="form.numero"
            type="number"
            step="0.01"
            min="0"
            class="input"
            placeholder="130.5"
            required
        /></label>
        <label class="block"
          ><span class="mb-1 block text-xs uppercase tracking-wide text-muted"
            >Volumen (opcional)</span
          >
          <input v-model="form.volumen" type="number" min="0" class="input"
        /></label>
        <label class="col-span-2 block"
          ><span class="mb-1 block text-xs uppercase tracking-wide text-muted"
            >Título (opcional)</span
          >
          <input v-model="form.titulo" class="input" maxlength="255"
        /></label>
      </section>

      <section v-if="isNovel" class="space-y-2">
        <label class="text-xs uppercase tracking-wide text-muted"
          >Texto del capítulo (novela)</label
        >
        <textarea
          v-model="form.contenido"
          rows="10"
          class="input font-display"
          placeholder="Pega aquí el texto. Separa los párrafos con una línea en blanco."
        />
        <p class="text-xs text-muted">
          O bien sube un .zip con imágenes si la novela se publica como
          imágenes.
        </p>
      </section>

      <section v-if="!isNovel || !form.contenido.trim()">
        <label
          class="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition"
          :class="
            dragging
              ? 'border-accent bg-accent/10'
              : 'border-line hover:border-accent'
          "
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="onDrop"
        >
          <AppIcon name="upload" class="size-8 text-muted" />
          <span v-if="!zip" class="text-sm"
            >Arrastra el <b>.zip</b> del capítulo o toca para elegir</span
          >
          <span v-else class="text-sm"
            ><b>{{ zip.name }}</b> ·
            {{ (zip.size / 1048576).toFixed(1) }} MB</span
          >
          <span class="text-xs text-muted"
            >Páginas nombradas en orden (1.jpg, 2.jpg, …). Se convierten a WebP
            y se suben a Cloudflare R2.</span
          >
          <input
            type="file"
            accept=".zip,application/zip"
            class="sr-only"
            @change="setFile(($event.target as HTMLInputElement).files?.[0])"
          />
        </label>
      </section>

      <label class="flex items-center gap-2 text-sm"
        ><input
          v-model="form.reemplazar"
          type="checkbox"
          class="size-4 accent-[var(--v-accent)]"
        />Reemplazar si el capítulo ya existe</label
      >

      <div v-if="phase !== 'idle'" class="space-y-1" role="status">
        <div class="h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            class="h-full bg-accent transition-all"
            :class="phase === 'processing' ? 'w-full animate-pulse' : ''"
            :style="
              phase === 'uploading' ? { width: progress + '%' } : undefined
            "
          />
        </div>
        <p class="text-xs text-muted">
          {{
            phase === "uploading"
              ? `Subiendo… ${progress}%`
              : "Procesando: convirtiendo a WebP y publicando en R2…"
          }}
        </p>
      </div>

      <button class="btn-primary w-full" :disabled="phase !== 'idle'">
        Publicar capítulo
      </button>

      <p
        v-if="result"
        class="rounded-xl border border-line bg-surface p-4 text-sm"
      >
        ✅ Capítulo {{ fmtNum(result.numero) }} publicado<template
          v-if="result.paginas"
        >
          con {{ result.paginas }} páginas</template
        >.
        <NuxtLink
          v-if="obra"
          :to="`/leer/${obra.slug}/${result.numero}`"
          class="ml-1 text-accent hover:underline"
          >Abrir en el lector →</NuxtLink
        >
      </p>
    </form>
  </div>
</template>
