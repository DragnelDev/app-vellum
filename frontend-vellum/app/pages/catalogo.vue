<script setup lang="ts">
import type { Genero, MangaResumen, Paginado } from "~/utils/types";

const route = useRoute();
const router = useRouter();
const { publicApi } = useApi();
useSeoMeta({
  title: "Catálogo",
  description: "Explora el catálogo completo por género, tipo y estado.",
});

const { data: generos } = await useAsyncData("generos", () =>
  publicApi<Genero[]>("/generos"),
);

// Filtros guardados en la URL (compartibles y con SSR)
const q = ref(String(route.query.q ?? ""));
const tipo = ref(String(route.query.tipo ?? ""));
const estado = ref(String(route.query.estado ?? ""));
const orden = ref(String(route.query.orden ?? "recientes"));
const autor = ref(String(route.query.autor ?? ""));
const conCaps = ref(route.query.conCapitulos === "true");
const avanzado = ref(!!autor.value || conCaps.value);
const sel = ref<string[]>(
  route.query.genero ? String(route.query.genero).split(",") : [],
);

const debouncedQ = ref(q.value);
const debouncedAutor = ref(autor.value);
let t: ReturnType<typeof setTimeout>;
watch(q, (v) => {
  clearTimeout(t);
  t = setTimeout(() => (debouncedQ.value = v.trim()), 250);
});
let t2: ReturnType<typeof setTimeout>;
watch(autor, (v) => {
  clearTimeout(t2);
  t2 = setTimeout(() => (debouncedAutor.value = v.trim()), 250);
}); // búsqueda en tiempo real

const query = computed(() => ({
  q: debouncedQ.value || undefined,
  tipo: tipo.value || undefined,
  estado: estado.value || undefined,
  orden: orden.value !== "recientes" ? orden.value : undefined,
  genero: sel.value.length ? sel.value.join(",") : undefined,
  autor: debouncedAutor.value || undefined,
  conCapitulos: conCaps.value ? "true" : undefined,
}));
watch(query, (v) => router.replace({ query: v }));

const items = ref<MangaResumen[]>([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);

async function fetchPage(p: number) {
  return publicApi<Paginado<MangaResumen>>("/mangas", {
    query: { ...query.value, page: p, limit: 24 },
  });
}
const { data: first, refresh } = await useAsyncData(
  "catalogo",
  () => fetchPage(1),
  { watch: [query] },
);
watch(
  first,
  (r) => {
    if (r) {
      items.value = [...r.items];
      total.value = r.total;
      page.value = 1;
    }
  },
  { immediate: true },
);

async function more() {
  if (loading.value || items.value.length >= total.value) return;
  loading.value = true;
  try {
    const r = await fetchPage(page.value + 1);
    page.value++;
    items.value.push(...r.items);
  } finally {
    loading.value = false;
  }
}
// Scroll infinito
const sentinel = ref<HTMLElement>();
onMounted(() => {
  const io = new IntersectionObserver((e) => e[0]?.isIntersecting && more(), {
    rootMargin: "600px",
  });
  watchEffect(() => {
    io.disconnect();
    if (sentinel.value) io.observe(sentinel.value);
  });
  onBeforeUnmount(() => io.disconnect());
});

const toggleGenero = (s: string) =>
  (sel.value = sel.value.includes(s)
    ? sel.value.filter((x) => x !== s)
    : [...sel.value, s]);
const clear = () => {
  q.value = "";
  debouncedQ.value = "";
  autor.value = "";
  debouncedAutor.value = "";
  conCaps.value = false;
  tipo.value = "";
  estado.value = "";
  sel.value = [];
  orden.value = "recientes";
};
</script>

<template>
  <div class="container-v py-6">
    <h1 class="mb-4 font-display text-3xl">Catálogo</h1>

    <div
      class="sticky top-14 z-20 -mx-4 space-y-3 border-b border-line bg-bg/90 px-4 pb-3 pt-2 backdrop-blur"
    >
      <div class="flex gap-2">
        <label class="relative flex-1">
          <span class="sr-only">Buscar</span>
          <AppIcon
            name="search"
            class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <input
            v-model="q"
            type="search"
            class="input pl-9"
            placeholder="Buscar por título…"
          />
        </label>
        <select v-model="orden" class="input !w-auto" aria-label="Ordenar por">
          <option value="recientes">Recientes</option>
          <option value="populares">Populares</option>
          <option value="actualizados">Actualizados</option>
          <option value="titulo">A–Z</option>
        </select>
      </div>
      <div class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <button
          v-for="(l, k) in TIPO_LABEL"
          :key="k"
          class="chip shrink-0"
          :aria-pressed="tipo === k"
          @click="tipo = tipo === k ? '' : String(k)"
        >
          {{ l }}
        </button>
        <span class="mx-1 w-px shrink-0 bg-line" />
        <button
          v-for="(l, k) in ESTADO_LABEL"
          :key="k"
          class="chip shrink-0"
          :aria-pressed="estado === k"
          @click="estado = estado === k ? '' : String(k)"
        >
          {{ l }}
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          class="text-xs text-muted hover:text-accent"
          @click="avanzado = !avanzado"
        >
          {{ avanzado ? "− Ocultar" : "+ Búsqueda avanzada" }}
        </button>
        <template v-if="avanzado">
          <input
            v-model="autor"
            type="search"
            class="input !w-44 !py-1.5 text-xs"
            placeholder="Autor…"
            aria-label="Filtrar por autor"
          />
          <label class="flex items-center gap-1.5 text-xs text-muted"
            ><input
              v-model="conCaps"
              type="checkbox"
              class="accent-[var(--v-accent)]"
            />Solo con capítulos</label
          >
        </template>
      </div>
      <div class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <button
          v-for="g in generos"
          :key="g.id"
          class="chip shrink-0"
          :aria-pressed="sel.includes(g.slug)"
          @click="toggleGenero(g.slug)"
        >
          {{ g.nombre }}
        </button>
      </div>
    </div>

    <p class="my-4 flex items-center justify-between text-sm text-muted">
      <span>{{ total }} resultado{{ total === 1 ? "" : "s" }}</span>
      <button
        v-if="q || tipo || estado || sel.length || autor || conCaps"
        class="text-accent hover:underline"
        @click="clear"
      >
        Limpiar filtros
      </button>
    </p>

    <div
      v-if="items.length"
      class="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
    >
      <MangaCard v-for="m in items" :key="m.id" :manga="m" />
    </div>
    <p
      v-else
      class="rounded-xl border border-dashed border-line p-10 text-center text-muted"
    >
      No encontramos obras con esos filtros.
    </p>

    <div ref="sentinel" class="h-10" />
    <p v-if="loading" class="py-4 text-center text-sm text-muted">Cargando…</p>
  </div>
</template>
