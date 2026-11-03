<script setup lang="ts">
import type { EstadoLectura, MangaResumen, ObraDetalle } from "~/utils/types";

const route = useRoute();
const slug = String(route.params.slug);
const { publicApi, api } = useApi();
const { isLogged, requireAuth } = useAuth();
const toast = useToast();

const { data: obra, error } = await useAsyncData(`obra:${slug}`, () =>
  publicApi<ObraDetalle>(`/mangas/${slug}`),
);
if (error.value || !obra.value)
  throw createError({
    statusCode: 404,
    statusMessage: "Obra no encontrada",
    fatal: true,
  });

useSeoMeta({
  title: () => obra.value!.titulo,
  description: () => obra.value!.sinopsis.slice(0, 160),
  ogTitle: () => obra.value!.titulo,
  ogDescription: () => obra.value!.sinopsis.slice(0, 200),
  ogImage: () => obra.value!.portadaUrl ?? undefined,
  twitterCard: "summary_large_image",
});

const { data: relacionadas } = await useAsyncData(`rel:${slug}`, () =>
  publicApi<MangaResumen[]>(`/mangas/${slug}/relacionadas`).catch(() => []),
);
const asc = ref(false);
const capitulos = computed(() => {
  const list = [...(obra.value?.capitulos ?? [])];
  return asc.value ? list.reverse() : list;
});
const primero = computed(() => obra.value?.capitulos.at(-1));

// Estado de usuario (solo cliente)
const estado = ref<EstadoLectura | null>(null);
const continuar = ref<{ capituloNumero: number; pagina: number } | null>(null);
watch(
  isLogged,
  async (v) => {
    if (!v || !obra.value) {
      estado.value = null;
      continuar.value = null;
      return;
    }
    const [b, h] = await Promise.all([
      api<{ estado: EstadoLectura | null }>(
        `/biblioteca/${obra.value.id}`,
      ).catch(() => ({ estado: null })),
      api<{ capituloNumero: number; pagina: number } | null>(
        `/historial/obra/${obra.value.id}`,
      ).catch(() => null),
    ]);
    estado.value = b.estado;
    continuar.value = h;
  },
  { immediate: true },
);

const menu = ref(false);
async function setEstado(e: EstadoLectura | null) {
  menu.value = false;
  requireAuth(async () => {
    try {
      if (e)
        await api(`/biblioteca/${obra.value!.id}`, {
          method: "PUT",
          body: { estado: e },
        });
      else await api(`/biblioteca/${obra.value!.id}`, { method: "DELETE" });
      estado.value = e;
      toast.ok(
        e
          ? `Guardado como "${ESTADO_LECTURA_LABEL[e]}"`
          : "Quitado de tu biblioteca",
      );
    } catch (err) {
      toast.error(apiError(err));
    }
  });
}
</script>

<template>
  <div v-if="obra" class="container-v py-6">
    <div class="flex flex-col gap-6 sm:flex-row">
      <div class="mx-auto w-44 shrink-0 sm:mx-0 sm:w-56">
        <div
          class="aspect-[2/3] overflow-hidden rounded-2xl border border-line bg-surface-2"
        >
          <img
            v-if="obra.portadaUrl"
            :src="obra.portadaUrl"
            :alt="`Portada de ${obra.titulo}`"
            class="size-full object-cover"
            fetchpriority="high"
          />
        </div>
      </div>

      <div class="min-w-0 flex-1">
        <div class="mb-2 flex flex-wrap gap-2 text-xs">
          <span
            class="rounded-md bg-accent px-2 py-0.5 font-semibold text-on-accent"
            >{{ TIPO_LABEL[obra.tipo] }}</span
          >
          <span class="rounded-md bg-surface-2 px-2 py-0.5 text-muted">{{
            ESTADO_LABEL[obra.estado]
          }}</span>
          <span
            class="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-muted"
            ><AppIcon name="eye" class="size-3" />{{
              obra.vistas.toLocaleString("es")
            }}</span
          >
        </div>
        <h1 class="font-display text-3xl leading-tight sm:text-4xl">
          {{ obra.titulo }}
        </h1>
        <p v-if="obra.tituloAlternativo" class="mt-1 text-sm text-muted">
          {{ obra.tituloAlternativo }}
        </p>
        <p v-if="obra.autor" class="mt-1 text-sm text-muted">
          por {{ obra.autor }}
        </p>

        <div class="mt-3 flex flex-wrap gap-1.5">
          <NuxtLink
            v-for="g in obra.generos"
            :key="g.id"
            :to="`/catalogo?genero=${g.slug}`"
            class="chip hover:border-accent hover:text-accent"
            >{{ g.nombre }}</NuxtLink
          >
        </div>

        <p
          class="mt-4 max-w-prose whitespace-pre-line text-sm leading-relaxed text-fg/90"
        >
          {{ obra.sinopsis || "Sin sinopsis." }}
        </p>

        <div class="mt-5 flex flex-wrap items-center gap-2">
          <NuxtLink
            v-if="continuar"
            :to="`/leer/${obra.slug}/${continuar.capituloNumero}`"
            class="btn-primary"
            >Continuar · Cap. {{ fmtNum(continuar.capituloNumero) }}</NuxtLink
          >
          <NuxtLink
            v-else-if="primero"
            :to="`/leer/${obra.slug}/${primero.numero}`"
            class="btn-primary"
            >Empezar a leer</NuxtLink
          >
          <div class="relative">
            <button
              class="btn-ghost"
              @click="requireAuth(() => (menu = !menu))"
            >
              <AppIcon name="book" class="size-4" />{{
                estado ? ESTADO_LECTURA_LABEL[estado] : "Añadir a biblioteca"
              }}
            </button>
            <div
              v-if="menu"
              class="absolute left-0 z-10 mt-2 w-48 rounded-xl border border-line bg-surface p-1 shadow-xl"
            >
              <button
                v-for="(l, k) in ESTADO_LECTURA_LABEL"
                :key="k"
                class="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2"
                @click="setEstado(k as EstadoLectura)"
              >
                {{ l }}
              </button>
              <button
                v-if="estado"
                class="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-surface-2"
                @click="setEstado(null)"
              >
                Quitar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section class="mt-10" aria-labelledby="h-caps">
      <div class="mb-3 flex items-center justify-between">
        <h2 id="h-caps" class="font-display text-xl">
          {{ obra.capitulos.length }} capítulos
        </h2>
        <button class="chip" @click="asc = !asc">
          {{ asc ? "Más antiguos primero" : "Más recientes primero" }}
        </button>
      </div>
      <p
        v-if="!capitulos.length"
        class="rounded-xl border border-dashed border-line p-8 text-center text-muted"
      >
        Todavía no hay capítulos.
      </p>
      <ul
        class="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface"
      >
        <li v-for="c in capitulos" :key="c.id">
          <NuxtLink
            :to="`/leer/${obra.slug}/${c.numero}`"
            class="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2"
            :class="
              continuar?.capituloNumero === c.numero
                ? 'border-l-2 border-accent'
                : ''
            "
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">
                Capítulo {{ fmtNum(c.numero)
                }}<template v-if="c.titulo"> — {{ c.titulo }}</template>
              </p>
              <p class="text-xs text-muted">
                <template v-if="c.volumen">Vol. {{ c.volumen }} · </template
                >{{ timeAgo(c.publicadoEn) }}
              </p>
            </div>
            <span class="inline-flex items-center gap-1 text-xs text-muted"
              ><AppIcon name="eye" class="size-3.5" />{{ c.vistas }}</span
            >
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section v-if="relacionadas?.length" class="mt-12" aria-labelledby="h-rel">
      <h2 id="h-rel" class="mb-3 font-display text-xl">Te puede gustar</h2>
      <div class="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4">
        <div
          v-for="m in relacionadas"
          :key="m.id"
          class="w-32 shrink-0 snap-start sm:w-40"
        >
          <MangaCard :manga="m" />
        </div>
      </div>
    </section>
  </div>
</template>
