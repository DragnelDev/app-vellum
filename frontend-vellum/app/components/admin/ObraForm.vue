<script setup lang="ts">
import type { Genero, ObraDetalle } from "~/utils/types";
const props = defineProps<{ obra?: ObraDetalle | null; generos: Genero[] }>();
const emit = defineEmits<{ saved: []; close: [] }>();
const { api } = useApi();
const toast = useToast();

const f = reactive({
  titulo: props.obra?.titulo ?? "",
  tituloAlternativo: props.obra?.tituloAlternativo ?? "",
  autor: props.obra?.autor ?? "",
  sinopsis: props.obra?.sinopsis ?? "",
  tipo: props.obra?.tipo ?? "manga",
  estado: props.obra?.estado ?? "en_emision",
  generos: (props.obra?.generos ?? []).map((g) => g.id) as number[],
  destacado: !!(props.obra as any)?.destacado,
});
const cover = ref<File | null>(null);
const preview = ref<string | null>(props.obra?.portadaUrl ?? null);
const saving = ref(false);

function pick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  cover.value = file;
  preview.value = URL.createObjectURL(file);
}
const toggle = (id: number) =>
  (f.generos = f.generos.includes(id)
    ? f.generos.filter((x) => x !== id)
    : [...f.generos, id]);

async function save() {
  saving.value = true;
  try {
    const body = {
      ...f,
      tituloAlternativo: f.tituloAlternativo || undefined,
      autor: f.autor || undefined,
    };
    const obra = props.obra
      ? await api<{ id: number }>(`/admin/mangas/${props.obra.id}`, {
          method: "PATCH",
          body,
        })
      : await api<{ id: number }>("/admin/mangas", { method: "POST", body });
    if (cover.value) {
      const fd = new FormData();
      fd.append("archivo", cover.value);
      await api(`/admin/mangas/${obra.id}/portada`, {
        method: "POST",
        body: fd,
      });
    }
    toast.ok("Obra guardada");
    emit("saved");
  } catch (e) {
    toast.error(apiError(e));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      @mousedown.self="emit('close')"
    >
      <form
        class="w-full max-w-xl space-y-4 rounded-t-2xl border border-line bg-surface p-5 sm:rounded-2xl"
        @submit.prevent="save"
      >
        <div class="flex items-center justify-between">
          <h2 class="font-display text-xl">
            {{ obra ? "Editar obra" : "Nueva obra" }}
          </h2>
          <button
            type="button"
            class="text-muted hover:text-fg"
            aria-label="Cerrar"
            @click="emit('close')"
          >
            <AppIcon name="close" class="size-5" />
          </button>
        </div>

        <div class="flex gap-4">
          <label
            class="group relative aspect-[2/3] w-28 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-dashed border-line bg-surface-2"
          >
            <img
              v-if="preview"
              :src="preview"
              alt="Portada"
              class="size-full object-cover"
            />
            <span
              v-else
              class="grid size-full place-items-center p-2 text-center text-xs text-muted"
              >Subir portada</span
            >
            <input
              type="file"
              accept="image/*"
              class="sr-only"
              @change="pick"
            />
          </label>
          <div class="min-w-0 flex-1 space-y-3">
            <input
              v-model="f.titulo"
              class="input"
              placeholder="Título"
              required
              maxlength="255"
            />
            <input
              v-model="f.tituloAlternativo"
              class="input"
              placeholder="Título alternativo"
              maxlength="255"
            />
            <input
              v-model="f.autor"
              class="input"
              placeholder="Autor"
              maxlength="160"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <select v-model="f.tipo" class="input">
            <option v-for="(l, k) in TIPO_LABEL" :key="k" :value="k">
              {{ l }}
            </option>
          </select>
          <select v-model="f.estado" class="input">
            <option v-for="(l, k) in ESTADO_LABEL" :key="k" :value="k">
              {{ l }}
            </option>
          </select>
        </div>
        <textarea
          v-model="f.sinopsis"
          rows="4"
          class="input"
          placeholder="Sinopsis"
          maxlength="5000"
        />

        <label class="flex items-center gap-2 text-sm"
          ><input
            v-model="f.destacado"
            type="checkbox"
            class="size-4 accent-[var(--v-accent)]"
          />Mostrar en el banner de destacadas</label
        >

        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="g in generos"
            :key="g.id"
            type="button"
            class="chip"
            :aria-pressed="f.generos.includes(g.id)"
            @click="toggle(g.id)"
          >
            {{ g.nombre }}
          </button>
        </div>

        <div class="flex justify-end gap-2">
          <button type="button" class="btn-ghost" @click="emit('close')">
            Cancelar
          </button>
          <button class="btn-primary" :disabled="saving">
            {{ saving ? "Guardando…" : "Guardar" }}
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>
