<script setup lang="ts">
const { api } = useApi()
const { isLogged } = useAuth()
const count = useState('notif:count', () => 0)
let timer: ReturnType<typeof setInterval> | undefined

async function refresh() {
  if (!isLogged.value || document.hidden) return
  try { count.value = (await api<{ noLeidas: number }>('/notificaciones/contador')).noLeidas } catch { /* offline */ }
}
onMounted(() => {
  refresh()
  timer = setInterval(refresh, 60_000)
  document.addEventListener('visibilitychange', refresh)
})
onBeforeUnmount(() => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh) })
watch(isLogged, (v) => { count.value = 0; if (v) refresh() })
</script>
<template>
  <NuxtLink to="/notificaciones" class="btn-ghost relative !p-2" :aria-label="`Notificaciones${count ? `: ${count} sin leer` : ''}`">
    <AppIcon name="bell" class="size-5" />
    <span v-if="count" class="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-on-accent">{{ count > 99 ? '99+' : count }}</span>
  </NuxtLink>
</template>
