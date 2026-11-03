/** RBAC en el cliente: /admin solo para roles admin y uploader. (La API lo vuelve a validar con guards.) */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const { init, user, openLogin } = useAuth()
  await init()
  if (!user.value) { openLogin(to.fullPath); return navigateTo('/') }
  if (!['admin', 'uploader'].includes(user.value.rol)) {
    return abortNavigation(createError({ statusCode: 403, statusMessage: 'No tienes acceso a esta sección' }))
  }
  if (to.path.startsWith('/admin/usuarios') && user.value.rol !== 'admin') return navigateTo('/admin')
})
