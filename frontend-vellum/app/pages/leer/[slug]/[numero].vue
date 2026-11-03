<script setup lang="ts">
import type { LectorData } from "~/utils/types";

definePageMeta({ layout: "reader", key: (route) => route.fullPath });

const route = useRoute();
const slug = String(route.params.slug);
const numero = String(route.params.numero);
const { publicApi, api } = useApi();
const { isLogged, init } = useAuth();
const { prefs } = useReaderPrefs();

// Datos públicos (SSR + SEO). Lo específico del usuario se carga después en el cliente.
const { data, error } = await useAsyncData(`lector:${slug}:${numero}`, () =>
  publicApi<LectorData>(`/mangas/${slug}/capitulos/${numero}`),
);
if (error.value || !data.value)
  throw createError({
    statusCode: 404,
    statusMessage: "Capítulo no encontrado",
    fatal: true,
  });

const d = computed(() => data.value!);
const isNovel = computed(() => d.value.manga.tipo === "novela");
const paged = computed(
  () => !isNovel.value && prefs.value.modoLectura !== "vertical",
);
const rtl = computed(() => prefs.value.modoLectura === "paginado_rtl");
const total = computed(() => d.value.paginas.length);
const titulo = computed(
  () => `${d.value.manga.titulo} — Capítulo ${fmtNum(d.value.capitulo.numero)}`,
);
useSeoMeta({
  title: titulo,
  description: () =>
    `Lee el capítulo ${fmtNum(d.value.capitulo.numero)} de ${d.value.manga.titulo} online.`,
  ogImage: () => d.value.manga.portadaUrl ?? undefined,
});
useHead({
  link: () =>
    d.value.paginas[0]
      ? [
          {
            rel: "preload",
            as: "image",
            href: d.value.paginas[0].url,
            fetchpriority: "high",
          },
        ]
      : [],
});

const go = (n: number | undefined) =>
  n !== undefined && navigateTo(`/leer/${slug}/${n}`);
const goPrev = () => go(d.value.anterior?.numero);
const goNext = () => go(d.value.siguiente?.numero);

/* ---------- Barras ---------- */
const bars = ref(true);
let lastY = 0;
function onScroll() {
  const y = window.scrollY;
  if (!prefs.value.ocultarBarras) {
    bars.value = true;
    lastY = y;
    return;
  }
  if (y < 80) bars.value = true;
  else if (Math.abs(y - lastY) > 12) bars.value = y < lastY;
  lastY = y;
}

/* ---------- Página actual ---------- */
const pageEls: HTMLElement[] = [];
const current = ref(1);
let io: IntersectionObserver | undefined;

function observePages() {
  io?.disconnect();
  if (paged.value || isNovel.value) return;
  io = new IntersectionObserver(
    (entries) => {
      for (const en of entries)
        if (en.isIntersecting)
          current.value = Number((en.target as HTMLElement).dataset.page);
    },
    { rootMargin: "-50% 0px -50% 0px" },
  );
  pageEls.forEach((el) => el && io!.observe(el));
}

/* Modo paginado: navegar entre páginas, saltando de capítulo en los extremos */
function step(delta: 1 | -1) {
  const n = current.value + delta;
  if (n > total.value)
    return d.value.siguiente
      ? goNext()
      : document
          .getElementById("comentarios")
          ?.scrollIntoView({ behavior: "smooth" });
  if (n < 1) return d.value.anterior ? goPrev() : undefined;
  current.value = n;
  window.scrollTo({ top: 0 });
}
function onPagedClick(e: MouseEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  if (x < 0.3) step(rtl.value ? 1 : -1);
  else if (x > 0.7) step(rtl.value ? -1 : 1);
  else bars.value = !bars.value;
}
// Precarga de las siguientes páginas
const preloaded = new Set<string>();
function preload(url?: string) {
  if (url && !preloaded.has(url)) {
    preloaded.add(url);
    const i = new Image();
    i.decoding = "async";
    i.src = url;
  }
}
watch(current, (c) => {
  if (paged.value) {
    preload(d.value.paginas[c]?.url);
    preload(d.value.paginas[c + 1]?.url);
  }
});

// Precarga del capítulo siguiente cuando vas por el 60 %
let nextPrefetched = false;
watch(current, async (c) => {
  if (
    nextPrefetched ||
    !d.value.siguiente ||
    !total.value ||
    c / total.value < 0.6
  )
    return;
  nextPrefetched = true;
  try {
    const nx = await publicApi<LectorData>(
      `/mangas/${slug}/capitulos/${d.value.siguiente.numero}`,
    );
    nx.paginas.slice(0, 3).forEach((p) => preload(p.url));
  } catch {
    /* sin red: no pasa nada */
  }
});

/* ---------- Gestos táctiles ---------- */
let t0: { x: number; y: number; t: number } | null = null;
const onTouchStart = (e: TouchEvent) => {
  const t = e.touches[0]!;
  t0 = { x: t.clientX, y: t.clientY, t: Date.now() };
};
function onTouchEnd(e: TouchEvent) {
  if (!t0) return;
  const t = e.changedTouches[0]!;
  const dx = t.clientX - t0.x,
    dy = t.clientY - t0.y,
    dt = Date.now() - t0.t;
  const onControl = (e.target as HTMLElement).closest(
    "a,button,input,textarea,select,label,[data-spoiler]",
  );
  const swipe = Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 2.2;
  if (!onControl) {
    if (paged.value) {
      // en modo páginas el toque lo gestiona @click; aquí solo el deslizamiento
      if (prefs.value.gestosTactiles && swipe)
        step(dx < 0 !== rtl.value ? 1 : -1);
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 300)
      bars.value = !bars.value;
    else if (prefs.value.gestosTactiles && swipe && Math.abs(dx) > 110)
      go(dx < 0 ? d.value.siguiente?.numero : d.value.anterior?.numero);
  }
  t0 = null;
}

/* ---------- Atajos de teclado ---------- */
const panel = ref(false);
function onKey(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (
    (e.target as HTMLElement).closest("input,textarea,select,[contenteditable]")
  )
    return;
  switch (e.key) {
    case "ArrowRight":
      paged.value ? step(rtl.value ? -1 : 1) : goNext();
      break;
    case "ArrowLeft":
      paged.value ? step(rtl.value ? 1 : -1) : goPrev();
      break;
    case "]":
      goNext();
      break;
    case "[":
      goPrev();
      break;
    case "m":
    case "M":
      bars.value = !bars.value;
      break;
    case "p":
    case "P":
      panel.value = !panel.value;
      break;
    case "f":
    case "F":
      toggleFullscreen();
      break;
    default:
      return;
  }
  e.preventDefault();
}
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

/* ---------- Progreso y vistas ---------- */
let saveTimer: ReturnType<typeof setTimeout> | undefined;
function saveProgress(keepalive = false) {
  if (!isLogged.value) return;
  api("/historial", {
    method: "PUT",
    keepalive,
    body: {
      mangaId: d.value.manga.id,
      capituloId: d.value.capitulo.id,
      pagina: current.value,
    },
  }).catch(() => {});
}
watch(current, () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveProgress(), 1500);
});

let viewTimer: ReturnType<typeof setTimeout> | undefined;
onMounted(async () => {
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("keydown", onKey);
  viewTimer = setTimeout(
    () =>
      publicApi(`/capitulos/${d.value.capitulo.id}/vista`, {
        method: "POST",
      }).catch(() => {}),
    5000,
  );
  observePages();
  watch(paged, () => nextTick(observePages));
  if (paged.value) {
    preload(d.value.paginas[1]?.url);
    preload(d.value.paginas[2]?.url);
  }

  await init();
  if (isLogged.value) {
    const p = await api<{ pagina: number } | null>(
      `/historial/capitulo/${d.value.capitulo.id}`,
    ).catch(() => null);
    if (p && p.pagina > 1 && p.pagina <= total.value) {
      current.value = p.pagina;
      if (!paged.value)
        pageEls[p.pagina - 1]?.scrollIntoView({ block: "start" });
    }
  }
  // Ir a un comentario concreto (#c-123) desde notificaciones / moderación
  if (location.hash.startsWith("#c-"))
    setTimeout(
      () =>
        document
          .querySelector(location.hash)
          ?.scrollIntoView({ block: "center" }),
      1200,
    );
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("keydown", onKey);
  io?.disconnect();
  clearTimeout(viewTimer);
  clearTimeout(saveTimer);
  if (current.value > 1) saveProgress(true);
});

const gap = computed(
  () =>
    ({ sin_espacio: "0px", fina: "6px", amplia: "28px" })[
      prefs.value.separacionVinetas
    ],
);
const paragraphs = computed(() =>
  (d.value.capitulo.contenido ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean),
);
const pct = computed(() =>
  total.value ? Math.round((current.value / total.value) * 100) : 0,
);
const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
const filter = computed(() => `brightness(${prefs.value.brillo}%)`);
</script>

<template>
  <div @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
    <!-- Barra superior -->
    <header
      class="fixed inset-x-0 top-0 z-40 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur transition-transform duration-300"
      :class="bars ? 'translate-y-0' : '-translate-y-full'"
    >
      <div class="mx-auto flex h-12 max-w-3xl items-center gap-1 px-3">
        <NuxtLink
          :to="`/obra/${slug}`"
          class="rounded-lg p-1.5 text-muted hover:text-fg"
          aria-label="Volver a la obra"
          ><AppIcon name="left" class="size-5"
        /></NuxtLink>
        <div class="min-w-0 flex-1 leading-tight">
          <p class="truncate text-sm font-medium">{{ d.manga.titulo }}</p>
          <label class="relative block text-xs text-muted">
            <span class="sr-only">Ir a otro capítulo</span>
            <select
              class="-ml-1 max-w-full cursor-pointer appearance-none bg-transparent py-0.5 pr-4 text-xs text-muted outline-none hover:text-fg"
              :value="d.capitulo.numero"
              @change="go(Number(($event.target as HTMLSelectElement).value))"
            >
              <option
                v-for="c in d.capitulos"
                :key="c.numero"
                :value="c.numero"
                class="bg-surface text-fg"
              >
                Capítulo {{ fmtNum(c.numero)
                }}{{ c.titulo ? ` · ${c.titulo}` : "" }}
              </option>
            </select>
            <span
              class="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[8px]"
              >▼</span
            >
          </label>
        </div>
        <button
          class="hidden rounded-lg p-2 text-xs text-muted hover:text-fg sm:block"
          aria-label="Pantalla completa"
          title="Pantalla completa (F)"
          @click="toggleFullscreen"
        >
          ⛶
        </button>
        <button
          class="rounded-lg p-2 text-muted hover:text-accent"
          aria-label="Preferencias de lectura"
          title="Preferencias (P)"
          @click="panel = true"
        >
          <AppIcon name="gear" class="size-5" />
        </button>
      </div>
    </header>

    <main class="pt-12">
      <div
        class="mx-auto px-3 pt-4"
        :style="{ maxWidth: Math.min(prefs.anchoPagina, 900) + 'px' }"
      >
        <ReactionBar :capitulo-id="d.capitulo.id" />
      </div>

      <!-- Cómic · vertical (webtoon) -->
      <div
        v-if="!isNovel && !paged"
        class="mx-auto mt-4 flex flex-col"
        :style="{ maxWidth: prefs.anchoPagina + 'px', gap, filter }"
      >
        <img
          v-for="(p, i) in d.paginas"
          :key="p.orden"
          :ref="
            (el) => {
              if (el) pageEls[i] = el as HTMLElement;
            }
          "
          :data-page="i + 1"
          :src="p.url"
          :width="p.ancho ?? undefined"
          :height="p.alto ?? undefined"
          :alt="`Página ${i + 1}`"
          :loading="i < 3 ? 'eager' : 'lazy'"
          :fetchpriority="i === 0 ? 'high' : 'auto'"
          decoding="async"
          class="block h-auto w-full select-none bg-surface"
          :style="!p.alto ? { minHeight: '60vh' } : undefined"
        />
      </div>

      <!-- Cómic · página a página (LTR o manga RTL) -->
      <div
        v-else-if="!isNovel && paged"
        class="mx-auto mt-4 cursor-pointer select-none"
        :style="{ maxWidth: prefs.anchoPagina + 'px', filter }"
        @click="onPagedClick"
      >
        <img
          :key="current"
          :src="d.paginas[current - 1]?.url"
          :width="d.paginas[current - 1]?.ancho ?? undefined"
          :height="d.paginas[current - 1]?.alto ?? undefined"
          :alt="`Página ${current} de ${total}`"
          decoding="async"
          fetchpriority="high"
          class="block h-auto w-full bg-surface"
          draggable="false"
        />
        <p class="mt-2 text-center text-xs text-muted">
          Toca el lado {{ rtl ? "izquierdo" : "derecho" }} para avanzar · centro
          para las barras
        </p>
      </div>

      <!-- Novela ligera -->
      <article
        v-else
        class="mx-auto mt-4 px-4 pb-6 font-display"
        :style="{
          maxWidth: Math.min(prefs.anchoPagina, 760) + 'px',
          fontSize: prefs.tamanoFuente + 'px',
          lineHeight: 1.85,
          filter,
        }"
      >
        <h1 class="mb-6 text-center text-2xl font-semibold">
          Capítulo {{ fmtNum(d.capitulo.numero)
          }}<template v-if="d.capitulo.titulo"
            ><br /><span class="text-base font-normal text-muted">{{
              d.capitulo.titulo
            }}</span></template
          >
        </h1>
        <p
          v-for="(p, i) in paragraphs"
          :key="i"
          class="mb-[1em] whitespace-pre-line"
        >
          {{ p }}
        </p>
      </article>

      <nav
        class="mx-auto my-8 grid max-w-xl grid-cols-2 gap-3 px-3"
        aria-label="Capítulos"
      >
        <NuxtLink
          v-if="d.anterior"
          :to="`/leer/${slug}/${d.anterior.numero}`"
          class="btn-ghost"
          ><AppIcon name="left" class="size-4" />Cap.
          {{ fmtNum(d.anterior.numero) }}</NuxtLink
        ><span v-else />
        <NuxtLink
          v-if="d.siguiente"
          :to="`/leer/${slug}/${d.siguiente.numero}`"
          class="btn-primary"
          >Cap. {{ fmtNum(d.siguiente.numero)
          }}<AppIcon name="right" class="size-4"
        /></NuxtLink>
        <NuxtLink v-else :to="`/obra/${slug}`" class="btn-ghost col-start-2"
          >Volver a la obra</NuxtLink
        >
      </nav>

      <div id="comentarios" class="mx-auto max-w-3xl px-3 pb-28">
        <CommentSection :capitulo-id="d.capitulo.id" />
      </div>
    </main>

    <!-- Barra inferior -->
    <footer
      class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur transition-transform duration-300"
      :class="bars ? 'translate-y-0' : 'translate-y-full'"
    >
      <div class="h-0.5 bg-surface-2">
        <div
          class="h-full bg-accent transition-all"
          :style="{ width: pct + '%' }"
        />
      </div>
      <div
        class="mx-auto flex h-12 max-w-3xl items-center justify-between px-3"
      >
        <button
          class="rounded-lg p-2 text-muted enabled:hover:text-fg disabled:opacity-30"
          :disabled="!d.anterior"
          aria-label="Capítulo anterior"
          title="Capítulo anterior ([)"
          @click="goPrev"
        >
          <AppIcon name="left" class="size-5" />
        </button>
        <div class="flex items-center gap-1">
          <button
            v-if="paged"
            class="rounded-lg px-2 py-1 text-muted hover:text-fg"
            aria-label="Página anterior"
            @click="step(-1)"
          >
            ‹
          </button>
          <span class="min-w-14 text-center text-xs tabular-nums text-muted">{{
            isNovel ? `${pct}%` : `${current} / ${total}`
          }}</span>
          <button
            v-if="paged"
            class="rounded-lg px-2 py-1 text-muted hover:text-fg"
            aria-label="Página siguiente"
            @click="step(1)"
          >
            ›
          </button>
        </div>
        <div class="flex items-center">
          <button
            class="rounded-lg p-2 text-muted hover:text-fg"
            aria-label="Ir arriba"
            @click="toTop"
          >
            <AppIcon name="up" class="size-5" />
          </button>
          <button
            class="rounded-lg p-2 text-muted enabled:hover:text-fg disabled:opacity-30"
            :disabled="!d.siguiente"
            aria-label="Capítulo siguiente"
            title="Capítulo siguiente (])"
            @click="goNext"
          >
            <AppIcon name="right" class="size-5" />
          </button>
        </div>
      </div>
    </footer>

    <ReaderPrefsPanel :open="panel" :novel="isNovel" @close="panel = false" />
  </div>
</template>
