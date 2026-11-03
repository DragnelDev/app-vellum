<script setup lang="ts">
definePageMeta({ middleware: "admin" });
useSeoMeta({ title: "Panel de administración", robots: "noindex" });
const { api } = useApi();
const { isAdmin } = useAuth();

interface Stats {
  totales: {
    obras: number;
    capitulos: number;
    usuarios: number;
    comentarios: number;
    vistas: number;
    reportesPendientes: number;
  };
  vistasPorDia: { dia: string; vistas: number }[];
  topSemana: { id: number; titulo: string; slug: string; vistas: number }[];
  recientes: {
    id: number;
    numero: number;
    publicadoEn: string;
    titulo: string;
    slug: string;
  }[];
}
const stats = ref<Stats | null>(null);
const error = ref("");
onMounted(async () => {
  try {
    stats.value = await api<Stats>("/admin/estadisticas");
  } catch (e) {
    error.value = apiError(e);
  }
});

const max = computed(() =>
  Math.max(1, ...(stats.value?.vistasPorDia.map((d) => d.vistas) ?? [1])),
);
const cards = computed(() =>
  stats.value
    ? [
        { l: "Obras", v: stats.value.totales.obras },
        { l: "Capítulos", v: stats.value.totales.capitulos },
        { l: "Usuarios", v: stats.value.totales.usuarios },
        { l: "Comentarios", v: stats.value.totales.comentarios },
        { l: "Vistas totales", v: stats.value.totales.vistas },
      ]
    : [],
);
const fmtDia = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("es", {
    day: "numeric",
    month: "short",
  });
</script>

<template>
  <div class="container-v py-6">
    <AdminNav />
    <h1 class="mb-5 font-display text-3xl">Panel</h1>
    <p v-if="error" class="text-red-400">{{ error }}</p>
    <p v-else-if="!stats" class="text-muted">Cargando…</p>
    <template v-else>
      <NuxtLink
        v-if="isAdmin && stats.totales.reportesPendientes"
        to="/admin/moderacion"
        class="mb-4 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
      >
        <AppIcon name="flag" class="size-4" />{{
          stats.totales.reportesPendientes
        }}
        comentario{{
          stats.totales.reportesPendientes === 1 ? "" : "s"
        }}
        reportado{{ stats.totales.reportesPendientes === 1 ? "" : "s" }} por
        revisar →
      </NuxtLink>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div
          v-for="c in cards"
          :key="c.l"
          class="rounded-xl border border-line bg-surface p-3"
        >
          <p class="text-2xl font-semibold tabular-nums">
            {{ c.v.toLocaleString("es") }}
          </p>
          <p class="text-xs text-muted">{{ c.l }}</p>
        </div>
      </div>

      <section
        class="mt-6 rounded-2xl border border-line bg-surface p-4"
        aria-label="Vistas de los últimos 14 días"
      >
        <h2 class="mb-3 text-sm font-medium">Vistas · últimos 14 días</h2>
        <div
          class="flex h-32 items-end gap-1"
          role="img"
          :aria-label="`Vistas por día, máximo ${max}`"
        >
          <div
            v-for="d in stats.vistasPorDia"
            :key="d.dia"
            class="group relative flex-1"
          >
            <div
              class="w-full rounded-t bg-accent/80 transition group-hover:bg-accent"
              :style="{ height: Math.max(2, (d.vistas / max) * 100) + '%' }"
            />
            <span
              class="pointer-events-none absolute -top-6 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white group-hover:block"
              >{{ fmtDia(d.dia) }}: {{ d.vistas }}</span
            >
          </div>
        </div>
        <div class="mt-1 flex justify-between text-[10px] text-muted">
          <span>{{ fmtDia(stats.vistasPorDia[0]!.dia) }}</span
          ><span>hoy</span>
        </div>
      </section>

      <div class="mt-6 grid gap-6 md:grid-cols-2">
        <section>
          <h2 class="mb-2 text-sm font-medium">Más vistas esta semana</h2>
          <ol
            class="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface"
          >
            <li
              v-for="(o, i) in stats.topSemana"
              :key="o.id"
              class="flex items-center gap-3 px-3 py-2.5 text-sm"
            >
              <span class="w-5 text-center text-muted">{{ i + 1 }}</span>
              <NuxtLink
                :to="`/admin/obras/${o.slug}`"
                class="min-w-0 flex-1 truncate hover:text-accent"
                >{{ o.titulo }}</NuxtLink
              >
              <span class="tabular-nums text-muted">{{
                o.vistas.toLocaleString("es")
              }}</span>
            </li>
            <li
              v-if="!stats.topSemana.length"
              class="px-3 py-4 text-sm text-muted"
            >
              Sin datos todavía.
            </li>
          </ol>
        </section>
        <section>
          <h2 class="mb-2 text-sm font-medium">Últimos capítulos</h2>
          <ul
            class="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface"
          >
            <li
              v-for="c in stats.recientes"
              :key="c.id"
              class="flex items-center gap-3 px-3 py-2.5 text-sm"
            >
              <NuxtLink
                :to="`/leer/${c.slug}/${c.numero}`"
                class="min-w-0 flex-1 truncate hover:text-accent"
                >{{ c.titulo }} · cap. {{ fmtNum(c.numero) }}</NuxtLink
              >
              <span class="text-xs text-muted">{{
                timeAgo(c.publicadoEn)
              }}</span>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>
