export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const { init, user, openLogin } = useAuth()
  await init()
  if (!user.value) { openLogin(to.fullPath); return navigateTo('/') }
})
