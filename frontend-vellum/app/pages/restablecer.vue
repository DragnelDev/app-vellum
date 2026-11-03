<script setup lang="ts">
useSeoMeta({ title: 'Nueva contraseña', robots: 'noindex' })
const route = useRoute()
const { publicApi } = useApi()
const { modal } = useAuth()
const toast = useToast()
const token = computed(() => String(route.query.token ?? ''))
const pass = ref(''); const pass2 = ref('')
const loading = ref(false); const error = ref('')
async function submit() {
  if (pass.value !== pass2.value) { error.value = 'Las contraseñas no coinciden'; return }
  loading.value = true; error.value = ''
  try {
    await publicApi('/auth/restablecer', { method: 'POST', body: { token: token.value, password: pass.value } })
    toast.ok('Contraseña actualizada. Ya puedes iniciar sesión.')
    await navigateTo('/'); modal.value = 'login'
  } catch (e) { error.value = apiError(e) } finally { loading.value = false }
}
</script>
<template>
  <div class="container-v max-w-md py-12">
    <h1 class="mb-4 font-display text-3xl">Elige una nueva contraseña</h1>
    <p v-if="!token" class="text-muted">Enlace no válido. <NuxtLink to="/recuperar" class="text-accent">Solicita uno nuevo</NuxtLink>.</p>
    <form v-else class="space-y-3" @submit.prevent="submit">
      <input v-model="pass" type="password" class="input" placeholder="Nueva contraseña (mín. 8)" minlength="8" required autocomplete="new-password" />
      <input v-model="pass2" type="password" class="input" placeholder="Repite la contraseña" minlength="8" required autocomplete="new-password" />
      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
      <button class="btn-primary w-full" :disabled="loading">{{ loading ? 'Guardando…' : 'Guardar contraseña' }}</button>
    </form>
  </div>
</template>
