export interface Usuario {
  id: string
  username: string
  email: string
  avatarUrl: string | null
  rol: 'admin' | 'uploader' | 'lector'
}

let initPromise: Promise<void> | null = null

export function useAuth() {
  const { api } = useApi()
  const user = useState<Usuario | null>('auth:user', () => null)
  const modal = useState<null | 'login' | 'registro'>('auth:modal', () => null)
  const redirectAfterLogin = useState<string | null>('auth:redirectAfterLogin', () => null)
  // Sesión persistente: 30 días
  const token = useCookie<string | null>('vellum_token', {
    maxAge: 60 * 60 * 24 * 30, sameSite: 'lax', secure: !import.meta.dev, default: () => null,
  })

  const justRegistered = useState('auth:justRegistered', () => false)
  const isLogged = computed(() => !!user.value)
  const canUpload = computed(() => user.value?.rol === 'admin' || user.value?.rol === 'uploader')
  const isAdmin = computed(() => user.value?.rol === 'admin')

  async function redirectAfterAuth() {
    const redirectTo = redirectAfterLogin.value ?? (canUpload.value ? '/admin' : null)
    redirectAfterLogin.value = null
    if (redirectTo?.startsWith('/') && !redirectTo.startsWith('//')) await navigateTo(redirectTo)
  }

  /** Restaura la sesión (solo cliente). Idempotente. */
  function init(): Promise<void> {
    if (import.meta.server) return Promise.resolve()
    initPromise ??= (async () => {
      const sessionToken = token.value
      if (!sessionToken) return
      try {
        const sessionUser = await api<Usuario>('/auth/me')
        if (token.value === sessionToken) user.value = sessionUser
      } catch {
        if (token.value === sessionToken) {
          token.value = null
          user.value = null
        }
      }
    })()
    return initPromise
  }

  async function login(identificador: string, password: string) {
    const r = await api<{ token: string; usuario: Usuario }>('/auth/login', { method: 'POST', body: { identificador, password } })
    token.value = r.token; user.value = r.usuario; modal.value = null
    await redirectAfterAuth()
  }
  async function registro(username: string, email: string, password: string) {
    const r = await api<{ token: string; usuario: Usuario }>('/auth/registro', { method: 'POST', body: { username, email, password } })
    justRegistered.value = true // el plugin sube las preferencias locales a la cuenta nueva
    token.value = r.token; user.value = r.usuario; modal.value = null
    await redirectAfterAuth()
  }
  function logout() { token.value = null; user.value = null; navigateTo('/') }
  function openLogin(redirectTo?: string) {
    redirectAfterLogin.value = redirectTo ?? null
    modal.value = 'login'
  }
  function clearLoginRedirect() { redirectAfterLogin.value = null }
  /** Ejecuta `fn` solo si hay sesión; si no, abre el modal de login. */
  function requireAuth(fn: () => unknown) { return isLogged.value ? fn() : void (modal.value = 'login') }

  return { user, token, modal, justRegistered, isLogged, canUpload, isAdmin, init, login, registro, logout, openLogin, clearLoginRedirect, requireAuth }
}
