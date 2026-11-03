/** Cliente HTTP. `api` envía el token de sesión; `publicApi` no (para SSR cacheable). */
export function useApi() {
  const config = useRuntimeConfig()
  const token = useCookie<string | null>('vellum_token')
  const userState = useState<unknown>('auth:user')
  const baseURL = import.meta.server && config.apiBase ? config.apiBase : config.public.apiBase

  const publicApi = $fetch.create({ baseURL })

  const api = $fetch.create({
    baseURL,
    onRequest({ options }) {
      if (token.value) {
        const headers = new Headers(options.headers as HeadersInit | undefined)
        headers.set('Authorization', `Bearer ${token.value}`)
        options.headers = headers
      }
    },
    onResponseError({ options, response }) {
      // Sesión caducada o revocada
      const requestToken = new Headers(options.headers as HeadersInit | undefined)
        .get('Authorization')
        ?.replace(/^Bearer\s+/i, '')
      if (response.status === 401 && requestToken && requestToken === token.value && import.meta.client) {
        token.value = null
        userState.value = null
      }
    },
  })

  return { api, publicApi, baseURL }
}

export function apiError(e: unknown, fallback = 'Ocurrió un error'): string {
  const d = (e as any)?.data
  const m = d?.message
  return Array.isArray(m) ? m.join('. ') : m || fallback
}
