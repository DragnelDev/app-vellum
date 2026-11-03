<script setup lang="ts">
import type {
  Genero,
  MangaResumen,
  ObraDetalle,
  Paginado,
} from "~/utils/types";
definePageMeta({ middleware: "admin" });
useSeoMeta({ title: "Panel de administración", robots: "noindex" });

const { api, publicApi } = useApi();
const { isAdmin } = useAuth();
const toast = useToast();

const q = ref("");
const list = ref<Paginado<MangaResumen>>({
  items: [],
  total: 0,
  page: 1,
  limit: 40,
});
const generos = ref<Genero[]>([]);
const loading = ref(true);
const editing = ref<ObraDetalle | null>(null);
const creating = ref(false);

async function load() {
  loading.value = true;
  try {
    list.value = await publicApi<Paginado<MangaResumen>>("/mangas", {
      query: { q: q.value || undefined, orden: "actualizados", limit: 40 },
    });
  } finally {
    loading.value = false;
  }
}
let t: ReturnType<typeof setTimeout>;
watch(q, () => {
  clearTimeout(t);
  t = setTimeout(load, 250);
});
onMounted(async () => {
  generos.value = await publicApi<Genero[]>("/generos");
  load();
});

async function edit(m: MangaResumen) {
  editing.value = await publicApi<ObraDetalle>(`/mangas/${m.slug}`);
}
async function remove(m: MangaResumen) {
  if (
    !confirm(
      `¿Eliminar "${m.titulo}" con todos sus capítulos, comentarios y archivos? Esta acción no se puede deshacer.`,
    )
  )
    return;
  try {
    await api(`/admin/mangas/${m.id}`, { method: "DELETE" });
    toast.ok("Obra eliminada");
    load();
  } catch (e) {
    toast.error(apiError(e));
  }
}
const saved = () => {
  creating.value = false;
  editing.value = null;
  load();
};
</script>

<template>
  <div class="container-v py-6">
    <AdminNav />
    <div class="mb-5 flex flex-wrap items-center gap-3">
      <h1 class="font-display text-3xl">Obras</h1>
      <div class="ml-auto flex gap-2">
        <NuxtLink to="/admin/subir" class="btn-ghost"
          ><AppIcon name="upload" class="size-4" />Subir capítulo</NuxtLink
        >
        <button class="btn-primary" @click="creating = true">
          <AppIcon name="plus" class="size-4" />Nueva obra
        </button>
      </div>
    </div>

    <input
      v-model="q"
      type="search"
      class="input mb-4 max-w-md"
      placeholder="Buscar obra…"
    />

    <p v-if="loading" class="text-muted">Cargando…</p>
    <p
      v-else-if="!list.items.length"
      class="rounded-xl border border-dashed border-line p-10 text-center text-muted"
    >
      No hay obras. Crea la primera con “Nueva obra”.
    </p>
    <ul
      v-else
      class="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface"
    >
      <li
        v-for="m in list.items"
        :key="m.id"
        class="flex items-center gap-3 p-3"
      >
        <img
          v-if="m.portadaUrl"
          :src="m.portadaUrl"
          alt=""
          class="h-14 w-10 shrink-0 rounded object-cover"
          loading="lazy"
        />
        <div v-else class="h-14 w-10 shrink-0 rounded bg-surface-2" />
        <div class="min-w-0 flex-1">
          <NuxtLink
            :to="`/obra/${m.slug}`"
            class="block truncate text-sm font-medium hover:text-accent"
            >{{ m.titulo }}</NuxtLink
          >
          <p class="text-xs text-muted">
            {{ TIPO_LABEL[m.tipo]
            }}<template v-if="m.ultimoCapitulo != null">
              · último cap. {{ fmtNum(m.ultimoCapitulo) }}</template
            >
          </p>
        </div>
        <NuxtLink
          :to="`/admin/obras/${m.slug}`"
          class="btn-ghost !px-3 !py-1.5 text-xs"
          >Capítulos</NuxtLink
        >
        <NuxtLink
          :to="{ path: '/admin/subir', query: { obra: m.id } }"
          class="btn-ghost !px-3 !py-1.5 text-xs"
          >Subir</NuxtLink
        >
        <button class="btn-ghost !px-3 !py-1.5 text-xs" @click="edit(m)">
          Editar
        </button>
        <button
          v-if="isAdmin"
          class="rounded-lg p-2 text-muted hover:text-red-400"
          aria-label="Eliminar obra"
          @click="remove(m)"
        >
          <AppIcon name="trash" class="size-4" />
        </button>
      </li>
    </ul>

    <AdminObraForm
      v-if="creating"
      :generos="generos"
      @saved="saved"
      @close="creating = false"
    />
    <AdminObraForm
      v-if="editing"
      :obra="editing"
      :generos="generos"
      @saved="saved"
      @close="editing = null"
    />
  </div>
</template>
