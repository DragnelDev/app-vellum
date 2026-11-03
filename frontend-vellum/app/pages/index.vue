<script setup lang="ts">
import type { CapituloUltimo, MangaResumen, Paginado } from "~/utils/types";

const { publicApi, api } = useApi();
const { isLogged } = useAuth();

useSeoMeta({
  title: "Lee manga, manhwa, manhua y novelas",
  ogTitle: "Vellum — lectura minimalista",
  description:
    "Últimos capítulos de manga, manhwa, manhua y novelas ligeras. Lector rápido y personalizable.",
});

const { data: destacadas } = await useAsyncData("home:destacadas", () =>
  publicApi<MangaResumen[]>("/mangas/destacadas"),
);
const periodo = ref<"semana" | "mes" | "total">("semana");
const { data: ranking } = await useAsyncData(
  "home:ranking",
  () =>
    publicApi<MangaResumen[]>("/mangas/ranking", {
      query: { periodo: periodo.value, limit: 10 },
    }),
  { watch: [periodo] },
);
const { data: populares } = await useAsyncData("home:populares", () =>
  publicApi<Paginado<MangaResumen>>("/mangas", {
    query: { orden: "populares", limit: 12 },
  }),
);
const { data: ultimos } = await useAsyncData("home:ultimos", () =>
  publicApi<Paginado<CapituloUltimo>>("/capitulos/ultimos", {
    query: { limit: 24 },
  }),
);

const items = ref<CapituloUltimo[]>([]);
const page = ref(1);
watchEffect(() => {
  if (page.value === 1 && ultimos.value) items.value = [...ultimos.value.items];
});
const hasMore = computed(() =>
  ultimos.value ? items.value.length < ultimos.value.total : false,
);
const loadingMore = ref(false);
async function more() {
  loadingMore.value = true;
  try {
    const r = await publicApi<Paginado<CapituloUltimo>>("/capitulos/ultimos", {
      query: { limit: 24, page: page.value + 1 },
    });
    page.value++;
    items.value.push(...r.items);
  } finally {
    loadingMore.value = false;
  }
}

// "Continuar leyendo": datos de usuario, solo en el cliente
interface Continuar {
  mangaId: number;
  titulo: string;
  slug: string;
  portadaUrl: string | null;
  tipo: string;
  numero: number;
  pagina: number;
}
const continuar = ref<Continuar[]>([]);
watch(
  isLogged,
  async (v) => {
    continuar.value = v
      ? await api<Continuar[]>("/historial/continuar").catch(() => [])
      : [];
  },
  { immediate: true },
);
</script>

<template>
  <div class="container-v space-y-10 py-6">
    <!-- Banner de destacadas -->
    <section v-if="destacadas?.length" aria-label="Obras destacadas">
      <div
        class="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4"
      >
        <NuxtLink
          v-for="(m, i) in destacadas"
          :key="m.id"
          :to="`/obra/${m.slug}`"
          class="relative flex min-h-48 w-[88%] shrink-0 snap-center gap-4 overflow-hidden rounded-2xl border border-line bg-surface p-4 sm:w-[560px]"
        >
          <img
            v-if="m.portadaUrl"
            :src="m.portadaUrl"
            alt=""
            aria-hidden="true"
            class="absolute inset-0 size-full scale-110 object-cover opacity-20 blur-xl"
            :loading="i ? 'lazy' : 'eager'"
          />
          <img
            v-if="m.portadaUrl"
            :src="m.portadaUrl"
            :alt="`Portada de ${m.titulo}`"
            class="relative h-40 w-28 shrink-0 rounded-lg object-cover shadow-xl sm:h-44 sm:w-32"
            :loading="i ? 'lazy' : 'eager'"
          />
          <div class="relative min-w-0 self-center">
            <span
              class="text-[11px] font-semibold uppercase tracking-wider text-accent"
              >{{ TIPO_LABEL[m.tipo] }}</span
            >
            <h2 class="font-display text-2xl leading-tight">{{ m.titulo }}</h2>
            <p class="mt-1 line-clamp-3 text-xs text-muted">
              {{ (m as any).sinopsis }}
            </p>
            <span class="btn-primary mt-3 !py-1.5 text-xs">Leer ahora</span>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section v-if="continuar.length" aria-labelledby="h-cont">
      <h2 id="h-cont" class="mb-3 font-display text-xl">Continuar leyendo</h2>
      <div class="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4">
        <NuxtLink
          v-for="c in continuar"
          :key="c.mangaId"
          :to="`/leer/${c.slug}/${c.numero}`"
          class="flex w-72 shrink-0 snap-start gap-3 rounded-xl border border-line bg-surface p-2.5 hover:border-accent"
        >
          <img
            v-if="c.portadaUrl"
            :src="c.portadaUrl"
            alt=""
            class="h-20 w-14 rounded-md object-cover"
            loading="lazy"
          />
          <div class="min-w-0 self-center">
            <p class="truncate text-sm font-medium">{{ c.titulo }}</p>
            <p class="text-xs text-muted">
              Cap. {{ fmtNum(c.numero) }} · pág. {{ c.pagina }}
            </p>
            <p class="mt-1 text-xs text-accent">Continuar →</p>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section v-if="ranking?.length" aria-labelledby="h-rank">
      <div class="mb-3 flex items-center gap-2">
        <h2 id="h-rank" class="font-display text-xl">Ranking</h2>
        <div class="ml-auto flex gap-1.5">
          <button
            v-for="(l, k) in { semana: 'Semana', mes: 'Mes', total: 'Siempre' }"
            :key="k"
            class="chip"
            :aria-pressed="periodo === k"
            @click="periodo = k as typeof periodo"
          >
            {{ l }}
          </button>
        </div>
      </div>
      <ol class="grid gap-2 sm:grid-cols-2">
        <li v-for="(m, i) in ranking" :key="m.id">
          <NuxtLink
            :to="`/obra/${m.slug}`"
            class="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5 hover:border-accent"
          >
            <span
              class="w-6 text-center font-display text-xl"
              :class="i < 3 ? 'text-accent' : 'text-muted'"
              >{{ i + 1 }}</span
            >
            <img
              v-if="m.portadaUrl"
              :src="m.portadaUrl"
              alt=""
              class="h-14 w-10 rounded object-cover"
              loading="lazy"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ m.titulo }}</p>
              <p class="text-xs text-muted">{{ TIPO_LABEL[m.tipo] }}</p>
            </div>
            <span class="inline-flex items-center gap-1 text-xs text-muted"
              ><AppIcon name="eye" class="size-3.5" />{{
                (m.vistas ?? 0).toLocaleString("es")
              }}</span
            >
          </NuxtLink>
        </li>
      </ol>
    </section>

    <section v-if="populares?.items.length" aria-labelledby="h-pop">
      <div class="mb-3 flex items-end justify-between">
        <h2 id="h-pop" class="font-display text-xl">Populares</h2>
        <NuxtLink
          to="/catalogo?orden=populares"
          class="text-sm text-muted hover:text-accent"
          >Ver todo</NuxtLink
        >
      </div>
      <div class="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4">
        <div
          v-for="m in populares.items"
          :key="m.id"
          class="w-32 shrink-0 snap-start sm:w-40"
        >
          <MangaCard :manga="m" />
        </div>
      </div>
    </section>

    <section aria-labelledby="h-ult">
      <h2 id="h-ult" class="mb-3 font-display text-xl">Últimos capítulos</h2>
      <p
        v-if="!items.length"
        class="rounded-xl border border-dashed border-line p-8 text-center text-muted"
      >
        Aún no hay capítulos publicados.
      </p>
      <ul class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="c in items" :key="c.id">
          <NuxtLink
            :to="`/leer/${c.manga.slug}/${c.numero}`"
            class="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5 transition hover:border-accent"
          >
            <img
              v-if="c.manga.portadaUrl"
              :src="c.manga.portadaUrl"
              alt=""
              class="h-16 w-12 shrink-0 rounded-md object-cover"
              loading="lazy"
              decoding="async"
            />
            <div v-else class="h-16 w-12 shrink-0 rounded-md bg-surface-2" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ c.manga.titulo }}</p>
              <p class="truncate text-xs text-muted">
                Capítulo {{ fmtNum(c.numero)
                }}<template v-if="c.titulo"> · {{ c.titulo }}</template>
              </p>
            </div>
            <span class="shrink-0 text-[11px] text-muted">{{
              timeAgo(c.publicadoEn)
            }}</span>
          </NuxtLink>
        </li>
      </ul>
      <div v-if="hasMore" class="mt-5 text-center">
        <button class="btn-ghost" :disabled="loadingMore" @click="more">
          {{ loadingMore ? "Cargando…" : "Cargar más" }}
        </button>
      </div>
    </section>
  </div>
</template>
