<script setup lang="ts">
defineProps<{ open: boolean; novel?: boolean }>();
const emit = defineEmits<{ close: [] }>();
const { prefs, update, reset } = useReaderPrefs();

const fondos = [
  { c: "#0f172a", n: "Pizarra" },
  { c: "#020617", n: "Medianoche" },
  { c: "#111827", n: "Grafito" },
  { c: "#000000", n: "Negro" },
  { c: "#1c1917", n: "Piedra" },
  { c: "#f8fafc", n: "Blanco" },
  { c: "#f4ecd8", n: "Pergamino" },
];
const acentos = [
  { c: "#f59e0b", n: "Ámbar" },
  { c: "#d4af37", n: "Dorado" },
  { c: "#fb7185", n: "Rosa" },
  { c: "#38bdf8", n: "Cielo" },
  { c: "#34d399", n: "Menta" },
  { c: "#a78bfa", n: "Violeta" },
];
const modos = [
  { v: "vertical", l: "Vertical" },
  { v: "paginado", l: "Páginas →" },
  { v: "paginado_rtl", l: "← Manga" },
] as const;
const separaciones = [
  { v: "sin_espacio", l: "Sin espacio" },
  { v: "fina", l: "Fina" },
  { v: "amplia", l: "Amplia" },
] as const;

// Elegir un fondo claro/oscuro ajusta también el tema de texto
const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (
    ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150
  );
};
const setFondo = (c: string) =>
  update({ colorFondo: c, tema: isLight(c) ? "claro" : "oscuro" });
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-black/40"
        @click="emit('close')"
      />
    </Transition>
    <Transition
      enter-active-class="transition duration-250 ease-out"
      enter-from-class="translate-y-full sm:translate-x-full sm:translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-to-class="translate-y-full sm:translate-x-full sm:translate-y-0"
    >
      <aside
        v-if="open"
        role="dialog"
        aria-label="Preferencias de lectura"
        class="fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-80 sm:rounded-none sm:rounded-l-2xl"
      >
        <div class="mb-4 flex items-center justify-between">
          <h2 class="font-display text-lg">Lectura</h2>
          <button
            class="rounded-lg p-1 text-muted hover:text-fg"
            aria-label="Cerrar"
            @click="emit('close')"
          >
            <AppIcon name="close" class="size-5" />
          </button>
        </div>

        <div class="space-y-5 text-sm">
          <fieldset>
            <legend class="mb-2 text-xs uppercase tracking-wide text-muted">
              Fondo
            </legend>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="f in fondos"
                :key="f.c"
                :title="f.n"
                :aria-label="f.n"
                :aria-pressed="prefs.colorFondo === f.c"
                class="size-8 rounded-full border-2 border-line transition aria-pressed:scale-110 aria-pressed:border-accent"
                :style="{ background: f.c }"
                @click="setFondo(f.c)"
              />
              <label
                class="grid size-8 cursor-pointer place-items-center rounded-full border-2 border-dashed border-line text-xs text-muted"
                title="Personalizado"
                >+
                <input
                  type="color"
                  class="sr-only"
                  :value="prefs.colorFondo"
                  @input="setFondo(($event.target as HTMLInputElement).value)"
                />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend class="mb-2 text-xs uppercase tracking-wide text-muted">
              Color de acento
            </legend>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="a in acentos"
                :key="a.c"
                :title="a.n"
                :aria-label="a.n"
                :aria-pressed="prefs.colorAcento === a.c"
                class="size-8 rounded-full border-2 border-transparent transition aria-pressed:scale-110 aria-pressed:border-fg"
                :style="{ background: a.c }"
                @click="update({ colorAcento: a.c })"
              />
              <label
                class="grid size-8 cursor-pointer place-items-center rounded-full border-2 border-dashed border-line text-xs text-muted"
                title="Personalizado"
                >+
                <input
                  type="color"
                  class="sr-only"
                  :value="prefs.colorAcento"
                  @input="
                    update({
                      colorAcento: ($event.target as HTMLInputElement).value,
                    })
                  "
                />
              </label>
            </div>
          </fieldset>

          <label class="block">
            <span
              class="mb-2 flex justify-between text-xs uppercase tracking-wide text-muted"
              >Brillo <b class="text-fg">{{ prefs.brillo }}%</b></span
            >
            <input
              type="range"
              min="40"
              max="100"
              :value="prefs.brillo"
              class="w-full accent-[var(--v-accent)]"
              @input="
                update({ brillo: +($event.target as HTMLInputElement).value })
              "
            />
          </label>

          <label class="block">
            <span
              class="mb-2 flex justify-between text-xs uppercase tracking-wide text-muted"
              >Ancho de página
              <b class="text-fg">{{ prefs.anchoPagina }}px</b></span
            >
            <input
              type="range"
              min="400"
              max="1200"
              step="20"
              :value="prefs.anchoPagina"
              class="w-full accent-[var(--v-accent)]"
              @input="
                update({
                  anchoPagina: +($event.target as HTMLInputElement).value,
                })
              "
            />
          </label>

          <fieldset v-if="!novel">
            <legend class="mb-2 text-xs uppercase tracking-wide text-muted">
              Modo de lectura
            </legend>
            <div class="grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1">
              <button
                v-for="m in modos"
                :key="m.v"
                class="rounded-md py-1.5 text-xs transition"
                :class="
                  prefs.modoLectura === m.v
                    ? 'bg-accent font-semibold text-on-accent'
                    : 'text-muted'
                "
                @click="update({ modoLectura: m.v })"
              >
                {{ m.l }}
              </button>
            </div>
          </fieldset>

          <fieldset v-if="!novel && prefs.modoLectura === 'vertical'">
            <legend class="mb-2 text-xs uppercase tracking-wide text-muted">
              Separación de viñetas
            </legend>
            <div class="grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1">
              <button
                v-for="s in separaciones"
                :key="s.v"
                class="rounded-md py-1.5 text-xs transition"
                :class="
                  prefs.separacionVinetas === s.v
                    ? 'bg-accent font-semibold text-on-accent'
                    : 'text-muted'
                "
                @click="update({ separacionVinetas: s.v })"
              >
                {{ s.l }}
              </button>
            </div>
          </fieldset>

          <label v-else class="block">
            <span
              class="mb-2 flex justify-between text-xs uppercase tracking-wide text-muted"
              >Tamaño de letra
              <b class="text-fg">{{ prefs.tamanoFuente }}px</b></span
            >
            <input
              type="range"
              min="14"
              max="30"
              :value="prefs.tamanoFuente"
              class="w-full accent-[var(--v-accent)]"
              @input="
                update({
                  tamanoFuente: +($event.target as HTMLInputElement).value,
                })
              "
            />
          </label>

          <label class="flex items-center justify-between gap-3">
            <span>Ocultar barras al hacer scroll</span>
            <input
              type="checkbox"
              class="size-5 accent-[var(--v-accent)]"
              :checked="prefs.ocultarBarras"
              @change="
                update({
                  ocultarBarras: ($event.target as HTMLInputElement).checked,
                })
              "
            />
          </label>
          <label class="flex items-center justify-between gap-3">
            <span
              >Gestos táctiles
              <small class="block text-xs text-muted"
                >Desliza ← → para cambiar de capítulo</small
              ></span
            >
            <input
              type="checkbox"
              class="size-5 accent-[var(--v-accent)]"
              :checked="prefs.gestosTactiles"
              @change="
                update({
                  gestosTactiles: ($event.target as HTMLInputElement).checked,
                })
              "
            />
          </label>

          <details class="rounded-lg bg-surface-2 p-3 text-xs text-muted">
            <summary class="cursor-pointer text-fg">Atajos de teclado</summary>
            <ul class="mt-2 space-y-1">
              <li>
                <kbd>←</kbd> <kbd>→</kbd> página o capítulo anterior/siguiente
              </li>
              <li><kbd>[</kbd> <kbd>]</kbd> capítulo anterior/siguiente</li>
              <li>
                <kbd>M</kbd> mostrar/ocultar barras · <kbd>F</kbd> pantalla
                completa
              </li>
              <li><kbd>P</kbd> abrir este panel</li>
            </ul>
          </details>

          <button class="btn-ghost w-full" @click="reset">
            Restablecer valores
          </button>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>
