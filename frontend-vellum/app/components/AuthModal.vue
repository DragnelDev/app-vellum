<script setup lang="ts">
const { modal, login, registro, clearLoginRedirect } = useAuth();
const toast = useToast();
const form = reactive({
  identificador: "",
  username: "",
  email: "",
  password: "",
});
const loading = ref(false);
const error = ref("");
const isLogin = computed(() => modal.value === "login");

watch(modal, () => (error.value = ""));
const close = () => {
  clearLoginRedirect();
  modal.value = null;
};
onMounted(() => {
  const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
  window.addEventListener("keydown", onKey);
  onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
});

async function submit() {
  loading.value = true;
  error.value = "";
  const loggingIn = isLogin.value;
  try {
    if (loggingIn) await login(form.identificador, form.password);
    else await registro(form.username, form.email, form.password);
    toast.ok(loggingIn ? "Sesión iniciada" : "¡Bienvenido a Vellum!");
    form.password = "";
  } catch (e) {
    error.value = apiError(e, "No se pudo completar la solicitud");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="isLogin ? 'Iniciar sesión' : 'Crear cuenta'"
      @mousedown.self="close"
    >
      <div
        class="w-full max-w-sm rounded-t-2xl border border-line bg-surface p-6 shadow-2xl sm:rounded-2xl"
      >
        <div class="mb-5 flex items-center justify-between">
          <h2 class="font-display text-2xl">
            {{ isLogin ? "Bienvenido de nuevo" : "Crea tu cuenta" }}
          </h2>
          <button
            class="rounded-lg p-1 text-muted hover:text-fg"
            aria-label="Cerrar"
            @click="close"
          >
            <AppIcon name="close" class="size-5" />
          </button>
        </div>

        <form class="space-y-3" @submit.prevent="submit">
          <template v-if="isLogin">
            <input
              v-model="form.identificador"
              class="input"
              placeholder="Usuario o correo"
              autocomplete="username"
              required
              autofocus
            />
          </template>
          <template v-else>
            <input
              v-model="form.username"
              class="input"
              placeholder="Nombre de usuario"
              autocomplete="username"
              minlength="3"
              maxlength="32"
              pattern="[a-zA-Z0-9_.\-]+"
              required
              autofocus
            />
            <input
              v-model="form.email"
              type="email"
              class="input"
              placeholder="Correo electrónico"
              autocomplete="email"
              required
            />
          </template>
          <input
            v-model="form.password"
            type="password"
            class="input"
            :placeholder="
              isLogin ? 'Contraseña' : 'Contraseña (mín. 8 caracteres)'
            "
            :autocomplete="isLogin ? 'current-password' : 'new-password'"
            minlength="8"
            required
          />
          <p v-if="error" class="text-sm text-red-400" role="alert">
            {{ error }}
          </p>
          <NuxtLink
            v-if="isLogin"
            to="/recuperar"
            class="block text-right text-xs text-muted hover:text-accent"
            @click="close"
            >¿Olvidaste tu contraseña?</NuxtLink
          >
          <button class="btn-primary w-full" :disabled="loading">
            {{ loading ? "Un momento…" : isLogin ? "Entrar" : "Registrarme" }}
          </button>
        </form>

        <p class="mt-4 text-center text-sm text-muted">
          {{ isLogin ? "¿Aún no tienes cuenta?" : "¿Ya tienes cuenta?" }}
          <button
            class="text-accent hover:underline"
            @click="modal = isLogin ? 'registro' : 'login'"
          >
            {{ isLogin ? "Regístrate" : "Inicia sesión" }}
          </button>
        </p>
      </div>
    </div>
  </Teleport>
</template>
