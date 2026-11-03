<script setup lang="ts">
const { isAdmin } = useAuth()
const tabs = computed(() => [
  { to: '/admin', label: 'Panel', exact: true },
  { to: '/admin/obras', label: 'Obras' },
  { to: '/admin/subir', label: 'Subir capítulo' },
  { to: '/admin/generos', label: 'Géneros' },
  ...(isAdmin.value ? [{ to: '/admin/moderacion', label: 'Moderación' }, { to: '/admin/usuarios', label: 'Usuarios' }] : []),
])
const route = useRoute()
const active = (t: { to: string; exact?: boolean }) => (t.exact ? route.path === t.to : route.path.startsWith(t.to))
</script>
<template>
  <nav class="no-scrollbar -mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-line px-4" aria-label="Administración">
    <NuxtLink v-for="t in tabs" :key="t.to" :to="t.to" class="shrink-0 border-b-2 px-3 py-2.5 text-sm transition"
      :class="active(t) ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'">{{ t.label }}</NuxtLink>
  </nav>
</template>
