import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react"

import {
  getAccessToken,
  invalidateAuthSession,
  registerAuthFailureHandler,
  setAccessToken as setApiAccessToken,
} from "@/api/client"
import {
  AuthApiError,
  getCurrentUserRequest,
  loginRequest,
  logoutRequest,
  refreshAccessTokenRequest,
  updateCurrentUserRequest,
} from "@/api/authApi"
import type { AuthCredentials, AuthProfileUpdatePayload, AuthUser } from "@/pages/types"

type RestoreSessionOptions = {
  silent?: boolean
  hydrateUser?: boolean
}

type AuthContextValue = {
  user: AuthUser | null
  accessToken: string | null
  authLoading: boolean
  authBootstrapped: boolean
  isAuthenticated: boolean
  restoreSession: (options?: RestoreSessionOptions) => Promise<boolean>
  login: (credentials: AuthCredentials) => Promise<AuthUser>
  logout: () => Promise<void>
  updateProfile: (payload: AuthProfileUpdatePayload) => Promise<AuthUser>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessTokenState] = useState<string | null>(() => getAccessToken())
  const [authLoading, setAuthLoading] = useState(true)
  const [authBootstrapped, setAuthBootstrapped] = useState(false)
  const restorePromiseRef = useRef<Promise<boolean> | null>(null)
  const bootstrapRestoreRef = useRef(false)

  const isHardAuthFailure = useCallback((error: unknown) => {
    if (!(error instanceof AuthApiError)) {
      return false
    }
    return error.status === 401 || error.status === 403
  }, [])

  const applyAccessToken = useCallback((nextAccessToken: string | null) => {
    setApiAccessToken(nextAccessToken)
    setAccessTokenState(nextAccessToken)
  }, [])

  const clearAuthState = useCallback(() => {
    invalidateAuthSession()
    applyAccessToken(null)
    setUser(null)
  }, [applyAccessToken])

  const refreshAccessTokenOnly = useCallback(async () => {
    const { access } = await refreshAccessTokenRequest()
    applyAccessToken(access)
    return access
  }, [applyAccessToken])

  const hydrateAuthenticatedUser = useCallback(async () => {
    const currentUser = await getCurrentUserRequest()
    setUser(currentUser)
    return currentUser
  }, [])

  const restoreSession = useCallback(async (options: RestoreSessionOptions = {}) => {
    const { silent = false, hydrateUser = true } = options

    if (restorePromiseRef.current) {
      return restorePromiseRef.current
    }

    let currentRestorePromise: Promise<boolean> | null = null
    currentRestorePromise = (async () => {
      if (!silent) {
        setAuthLoading(true)
      }

      try {
        await refreshAccessTokenOnly()
        if (hydrateUser) {
          await hydrateAuthenticatedUser()
        }
        return true
      } catch (error) {
        if (isHardAuthFailure(error)) {
          clearAuthState()
          return false
        }

        // En errores transitorios (red/5xx/timeout), mantenemos la sesión previa
        // para evitar parpadeos y validaciones de permisos visibles.
        return Boolean(accessToken)
      } finally {
        if (!silent) {
          setAuthLoading(false)
        }
        if (restorePromiseRef.current === currentRestorePromise) {
          restorePromiseRef.current = null
        }
      }
    })()

    restorePromiseRef.current = currentRestorePromise
    return currentRestorePromise
  }, [accessToken, clearAuthState, hydrateAuthenticatedUser, isHardAuthFailure, refreshAccessTokenOnly])

  const login = useCallback(async (credentials: AuthCredentials) => {
    const { access } = await loginRequest(credentials)

    try {
      applyAccessToken(access)
      return await hydrateAuthenticatedUser()
    } catch (error) {
      clearAuthState()
      throw error
    }
  }, [applyAccessToken, clearAuthState, hydrateAuthenticatedUser])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      clearAuthState()
    }
  }, [clearAuthState])

  const updateProfile = useCallback(async (payload: AuthProfileUpdatePayload) => {
    const updatedUser = await updateCurrentUserRequest(payload)
    setUser(updatedUser)
    return updatedUser
  }, [])

  useEffect(() => {
    registerAuthFailureHandler(() => {
      clearAuthState()
      setAuthLoading(false)
    })

    return () => {
      registerAuthFailureHandler(null)
    }
  }, [clearAuthState])

  useEffect(() => {
    if (bootstrapRestoreRef.current) {
      return
    }

    bootstrapRestoreRef.current = true
    void restoreSession({ silent: false, hydrateUser: true }).finally(() => {
      setAuthBootstrapped(true)
    })
  }, [restoreSession])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    // Refresh silencioso para evitar cortes de sesión o parpadeos de permisos.
    const intervalMs = 4 * 60 * 1000

    const tick = () => {
      if (document.visibilityState !== "visible") {
        return
      }
      void restoreSession({ silent: true, hydrateUser: false })
    }

    const timer = window.setInterval(tick, intervalMs)
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void restoreSession({ silent: true, hydrateUser: false })
      }
    }
    const onFocus = () => {
      void restoreSession({ silent: true, hydrateUser: false })
    }
    const onPageShow = () => {
      void restoreSession({ silent: true, hydrateUser: false })
    }

    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onFocus)
    window.addEventListener("pageshow", onPageShow)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("pageshow", onPageShow)
    }
  }, [accessToken, restoreSession])

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        authLoading,
        authBootstrapped,
        isAuthenticated: Boolean(accessToken),
        restoreSession,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
