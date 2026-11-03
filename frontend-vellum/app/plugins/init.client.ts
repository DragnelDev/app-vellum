export default defineNuxtPlugin(() => {
  const { loadLocal, loadRemote, pushRemote } = useReaderPrefs();
  const { init, user, justRegistered } = useAuth();
  loadLocal();
  // No bloquea la hidratación: el estado de sesión llega en cuanto responde /auth/me
  init();

  // Al haber sesión: cuenta existente -> trae sus preferencias; cuenta nueva -> sube las locales
  watch(
    () => user.value?.id,
    (id) => {
      if (!id) return;
      if (justRegistered.value) {
        justRegistered.value = false;
        pushRemote();
      } else loadRemote();
    },
    { immediate: true },
  );

  // PWA: service worker solo en producción (en dev estorba al HMR)
  if (!import.meta.dev && "serviceWorker" in navigator) {
    window.addEventListener("load", () =>
      navigator.serviceWorker.register("/sw.js").catch(() => {}),
    );
  }

  // Spoilers de comentarios: clic para revelar
  document.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement).closest("[data-spoiler]");
    if (el) el.classList.toggle("revealed");
  });
});
