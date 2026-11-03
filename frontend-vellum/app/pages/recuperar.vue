<script setup lang="ts">
useSeoMeta({ title: 'Recuperar contraseña', robots: 'noindex' })
const { publicApi } = useApi()
const email = ref('')
const sent = ref(false)
const loading = ref(false)
const error = ref('')
async function submit() {
  loading.value = true; error.value = ''
  try { await publicApi('/auth/olvide', { method: 'POST', body: { email: email.value } }); sent.value = true }
  catch (e) { error.value = apiError(e) } finally { loading.value = false }
}
</script>
<template>
  <div class="container-v max-w-md py-12">
    <h1 class="mb-2 font-display text-3xl">Recuperar contraseña</h1>
    <p v-if="sent" class="rounded-xl border border-line bg-surface p-4 text-sm">Si el correo existe, te hemos enviado un enlace para elegir una nueva contraseña. Caduca en 1 hora.</p>
    <form v-else class="space-y-3" @submit.prevent="submit">
      <p class="text-sm text-muted">Escribe el correo de tu cuenta y te enviaremos un enlace.</p>
      <input v-model="email" type="email" class="input" placeholder="Correo electrónico" required autocomplete="email" />
      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
      <button class="btn-primary w-full" :disabled="loading">{{ loading ? 'Enviando…' : 'Enviar enlace' }}</button>
    </form>
  </div>
</template>
