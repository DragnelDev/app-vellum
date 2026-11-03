<script setup lang="ts">
import type { Usuario } from "~/composables/useAuth";
definePageMeta({ middleware: "admin" });
useSeoMeta({ title: "Usuarios", robots: "noindex" });

const { api } = useApi();
const toast = useToast();
const { user: me } = useAuth();
const q = ref("");
const items = ref<(Usuario & { activo?: boolean })[]>([]);
const total = ref(0);

async function load() {
  const r = await api<{ items: Usuario[]; total: number }>("/admin/usuarios", {
    query: { q: q.value || undefined },
  });
  items.value = r.items;
  total.value = r.total;
}
let t: ReturnType<typeof setTimeout>;
watch(q, () => {
  clearTimeout(t);
  t = setTimeout(load, 250);
});
onMounted(load);

async function toggle(u: Usuario & { activo?: boolean }) {
  const activo = !(u.activo ?? true);
  if (
    !activo &&
    !confirm(`¿Bloquear a ${u.username}? No podrá iniciar sesión ni comentar.`)
  )
    return;
  try {
    await api(`/admin/usuarios/${u.id}/activo`, {
      method: "PATCH",
      body: { activo },
    });
    u.activo = activo;
    toast.ok(activo ? "Usuario desbloqueado" : "Usuario bloqueado");
  } catch (e) {
    toast.error(apiError(e));
  }
}
async function setRol(u: Usuario, rol: string) {
  try {
    await api(`/admin/usuarios/${u.id}/rol`, {
      method: "PATCH",
      body: { rol },
    });
    u.rol = rol as Usuario["rol"];
    toast.ok(`${u.username} ahora es ${rol}`);
  } catch (e) {
    toast.error(apiError(e));
    load();
  }
}
</script>

<template>
  <div class="container-v py-6">
    <AdminNav />
    <h1 class="mb-4 font-display text-3xl">
      Usuarios <span class="text-base text-muted">({{ total }})</span>
    </h1>
    <input
      v-model="q"
      type="search"
      class="input mb-4 max-w-md"
      placeholder="Buscar por usuario o correo…"
    />
    <ul
      class="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface"
    >
      <li v-for="u in items" :key="u.id" class="flex items-center gap-3 p-3">
        <span
          class="grid size-9 place-items-center rounded-full bg-surface-2 text-sm font-bold"
          >{{ u.username[0]?.toUpperCase() }}</span
        >
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ u.username }}</p>
          <p class="truncate text-xs text-muted">{{ u.email }}</p>
        </div>
        <span
          v-if="u.activo === false"
          class="rounded bg-red-500/20 px-1.5 text-[10px] font-semibold uppercase text-red-400"
          >bloqueado</span
        >
        <button
          v-if="u.id !== me?.id"
          class="btn-ghost !px-3 !py-1.5 text-xs"
          @click="toggle(u)"
        >
          {{ u.activo === false ? "Desbloquear" : "Bloquear" }}
        </button>
        <select
          :value="u.rol"
          class="input !w-auto !py-1.5"
          :disabled="u.id === me?.id"
          @change="setRol(u, ($event.target as HTMLSelectElement).value)"
        >
          <option value="lector">lector</option>
          <option value="uploader">uploader</option>
          <option value="admin">admin</option>
        </select>
      </li>
    </ul>
  </div>
</template>
