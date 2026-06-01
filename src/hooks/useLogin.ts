import { useState } from "react"

import { useAuth } from "@/auth/useAuth"
import type { AuthCredentials } from "@/pages/types"

export function useLogin() {
  const { login: loginWithAuth } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function login(credentials: AuthCredentials) {
    setIsLoading(true)
    setError(null)

    try {
      return await loginWithAuth(credentials)
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo iniciar sesión"
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    login,
    isLoading,
    error,
  }
}

