<script setup lang="ts">
import type { Comentario } from "~/utils/types";
const props = defineProps<{
  c: Comentario;
  capituloId: number;
  depth?: number;
}>();
const emit = defineEmits<{ refresh: [] }>();
const { api } = useApi();
const { user, requireAuth } = useAuth();
const toast = useToast();

const reporting = ref(false);
const MOTIVOS: Record<string, string> = {
  spam: "Spam",
  spoiler: "Spoiler sin avisar",
  acoso: "Acoso",
  ofensivo: "Contenido ofensivo",
  otro: "Otro",
};
async function report(motivo: string) {
  reporting.value = false;
  try {
    await api(`/comentarios/${props.c.id}/reportar`, {
      method: "POST",
      body: { motivo },
    });
    toast.ok("Gracias, lo revisaremos");
  } catch (e) {
    toast.error(apiError(e));
  }
}
const depth = computed(() => props.depth ?? 0);
const replying = ref(false);
const collapsed = ref(false);
const likes = ref(props.c.likes);
const liked = ref(props.c.meGusta);
watch(
  () => props.c,
  (c) => {
    likes.value = c.likes;
    liked.value = c.meGusta;
  },
);

const canDelete = computed(
  () =>
    !!user.value &&
    (user.value.id === props.c.usuarioId || user.value.rol === "admin"),
);
const html = computed(() => renderRich(props.c.contenido));

function like() {
  requireAuth(async () => {
    try {
      const r = await api<{ meGusta: boolean; likes: number }>(
        `/comentarios/${props.c.id}/like`,
        { method: "PUT" },
      );
      liked.value = r.meGusta;
      likes.value = r.likes;
    } catch (e) {
      toast.error(apiError(e));
    }
  });
}
async function remove() {
  if (!confirm("¿Eliminar este comentario?")) return;
  try {
    await api(`/comentarios/${props.c.id}`, { method: "DELETE" });
    emit("refresh");
  } catch (e) {
    toast.error(apiError(e));
  }
}
const totalReplies = (c: Comentario): number =>
  c.respuestas.reduce((n, r) => n + 1 + totalReplies(r), 0);
</script>

<template>
  <article class="flex gap-2.5" :id="`c-${c.id}`">
    <img
      v-if="c.avatarUrl"
      :src="c.avatarUrl"
      alt=""
      class="size-8 shrink-0 rounded-full object-cover"
      loading="lazy"
    />
    <span
      v-else
      class="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold text-muted"
      >{{ c.username[0]?.toUpperCase() }}</span
    >

    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-baseline gap-x-2 text-xs">
        <b class="text-sm">{{ c.username }}</b>
        <span
          v-if="c.rol !== 'lector'"
          class="rounded bg-accent/20 px-1.5 text-[10px] font-semibold uppercase text-accent"
          >{{ c.rol }}</span
        >
        <time class="text-muted" :datetime="c.creadoEn">{{
          timeAgo(c.creadoEn)
        }}</time>
      </div>

      <p v-if="c.eliminado" class="mt-0.5 text-sm italic text-muted">
        [comentario eliminado]
      </p>
      <template v-else>
        <div
          v-if="c.contenido"
          class="mt-0.5 break-words text-sm leading-relaxed"
          v-html="html"
        />
        <div v-if="c.multimedia.length" class="mt-2 flex flex-wrap gap-2">
          <a
            v-for="m in c.multimedia"
            :key="m.id"
            :href="m.url"
            target="_blank"
            rel="noopener"
          >
            <img
              :src="m.url"
              :alt="m.tipo"
              loading="lazy"
              :width="m.ancho ?? undefined"
              :height="m.alto ?? undefined"
              class="max-h-64 max-w-full rounded-lg border border-line object-contain"
              :class="m.tipo === 'sticker' ? 'max-h-36 border-0' : ''"
            />
          </a>
        </div>
        <div class="mt-1.5 flex items-center gap-4 text-xs text-muted">
          <button
            class="inline-flex items-center gap-1 hover:text-fg"
            :class="liked ? '!text-red-400' : ''"
            :aria-pressed="liked"
            @click="like"
          >
            <AppIcon
              name="heart"
              class="size-4"
              :class="liked ? 'fill-current' : ''"
            />{{ likes || "" }}
          </button>
          <button
            class="inline-flex items-center gap-1 hover:text-fg"
            @click="requireAuth(() => (replying = !replying))"
          >
            <AppIcon name="reply" class="size-4" />Responder
          </button>
          <button
            v-if="canDelete"
            class="inline-flex items-center gap-1 hover:text-red-400"
            @click="remove"
          >
            <AppIcon name="trash" class="size-4" />Eliminar
          </button>
          <span v-if="user && user.id !== c.usuarioId" class="relative">
            <button
              class="inline-flex items-center gap-1 hover:text-fg"
              aria-label="Reportar comentario"
              @click="reporting = !reporting"
            >
              <AppIcon name="flag" class="size-4" />
            </button>
            <span
              v-if="reporting"
              class="absolute bottom-full left-0 z-10 mb-1 w-44 rounded-xl border border-line bg-surface p-1 shadow-xl"
            >
              <button
                v-for="(l, k) in MOTIVOS"
                :key="k"
                class="block w-full rounded-lg px-3 py-1.5 text-left text-xs hover:bg-surface-2"
                @click="report(String(k))"
              >
                {{ l }}
              </button>
            </span>
          </span>
        </div>
      </template>

      <div v-if="replying" class="mt-2">
        <CommentComposer
          :capitulo-id="capituloId"
          :padre-id="c.id"
          :placeholder="`Responder a ${c.username}…`"
          autofocus
          @sent="
            replying = false;
            emit('refresh');
          "
          @cancel="replying = false"
        />
      </div>

      <template v-if="c.respuestas.length">
        <button
          class="mt-2 text-xs text-accent hover:underline"
          @click="collapsed = !collapsed"
        >
          {{
            collapsed
              ? `Ver ${totalReplies(c)} respuesta${totalReplies(c) === 1 ? "" : "s"}`
              : "Ocultar respuestas"
          }}
        </button>
        <!-- Indentación solo hasta 3 niveles para que quepa en móvil -->
        <div
          v-show="!collapsed"
          class="mt-3 space-y-4"
          :class="depth < 3 ? 'border-l border-line pl-3' : ''"
        >
          <CommentItem
            v-for="r in c.respuestas"
            :key="r.id"
            :c="r"
            :capitulo-id="capituloId"
            :depth="depth + 1"
            @refresh="emit('refresh')"
          />
        </div>
      </template>
    </div>
  </article>
</template>
