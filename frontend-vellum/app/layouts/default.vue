<script setup lang="ts">
const { user, isLogged, canUpload, isAdmin, logout, modal } = useAuth();
const route = useRoute();
const menu = ref(false);
watch(
  () => route.fullPath,
  () => (menu.value = false),
);

const nav = [
  { to: "/", label: "Inicio", icon: "home" },
  { to: "/catalogo", label: "Catálogo", icon: "grid" },
  { to: "/biblioteca", label: "Biblioteca", icon: "book" },
];
const q = ref("");
const search = () =>
  navigateTo({ path: "/catalogo", query: q.value ? { q: q.value } : {} });
</script>

<template>
  <div class="min-h-dvh pb-20 md:pb-0">
    <header
      class="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur"
    >
      <div class="container-v flex h-14 items-center gap-4">
        <NuxtLink to="/" class="font-display text-2xl tracking-tight"
          >Vell<span class="text-accent">um</span></NuxtLink
        >

        <nav class="ml-4 hidden gap-1 md:flex" aria-label="Principal">
          <NuxtLink
            v-for="n in nav"
            :key="n.to"
            :to="n.to"
            class="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-fg"
            active-class="!text-fg bg-surface-2"
            exact-active-class="!text-fg bg-surface-2"
            >{{ n.label }}</NuxtLink
          >
        </nav>

        <form
          class="ml-auto hidden max-w-xs flex-1 md:block"
          @submit.prevent="search"
          role="search"
        >
          <label class="relative block">
            <span class="sr-only">Buscar obras</span>
            <AppIcon
              name="search"
              class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            />
            <input
              v-model="q"
              class="input !py-2 pl-9"
              placeholder="Buscar obras…"
            />
          </label>
        </form>

        <div class="ml-auto flex items-center gap-2 md:ml-0">
          <NuxtLink
            to="/catalogo"
            class="btn-ghost !p-2 md:!hidden"
            aria-label="Buscar"
            ><AppIcon name="search" class="size-5"
          /></NuxtLink>
          <ClientOnly>
            <template v-if="isLogged && user">
              <NotificationBell />
              <div class="relative">
                <button
                  class="flex items-center gap-2 rounded-full bg-surface-2 p-1 pr-3 text-sm"
                  @click="menu = !menu"
                  :aria-expanded="menu"
                >
                  <img
                    v-if="user.avatarUrl"
                    :src="user.avatarUrl"
                    alt=""
                    class="size-7 rounded-full object-cover"
                  />
                  <span
                    v-else
                    class="grid size-7 place-items-center rounded-full bg-accent text-xs font-bold text-on-accent"
                    >{{ user.username[0]?.toUpperCase() }}</span
                  >
                  <span class="hidden sm:inline">{{ user.username }}</span>
                </button>
                <div
                  v-if="menu"
                  class="absolute right-0 mt-2 w-48 rounded-xl border border-line bg-surface p-1 shadow-xl"
                >
                  <NuxtLink
                    to="/perfil"
                    class="block rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
                    >Mi perfil</NuxtLink
                  >
                  <NuxtLink
                    to="/biblioteca"
                    class="block rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
                    >Mi biblioteca</NuxtLink
                  >
                  <NuxtLink
                    v-if="canUpload"
                    to="/admin"
                    class="block rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
                    >Panel admin</NuxtLink
                  >
                  <NuxtLink
                    v-if="isAdmin"
                    to="/admin/usuarios"
                    class="block rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
                    >Usuarios</NuxtLink
                  >
                  <button
                    class="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-surface-2"
                    @click="logout"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <button class="btn-ghost" @click="modal = 'login'">Entrar</button>
              <button
                class="btn-primary hidden sm:inline-flex"
                @click="modal = 'registro'"
              >
                Crear cuenta
              </button>
            </template>
            <template #fallback><div class="h-9 w-20" /></template>
          </ClientOnly>
        </div>
      </div>
    </header>

    <main><slot /></main>

    <footer class="container-v mt-16 hidden py-8 text-xs text-muted md:block">
      © Vellum — lectura sin distracciones.
    </footer>

    <!-- Navegación inferior (móvil) -->
    <nav
      class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Principal móvil"
    >
      <NuxtLink
        v-for="n in nav"
        :key="n.to"
        :to="n.to"
        class="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted"
        active-class="!text-accent"
        exact-active-class="!text-accent"
      >
        <AppIcon :name="n.icon" class="size-5" />{{ n.label }}
      </NuxtLink>
    </nav>
  </div>
</template>
