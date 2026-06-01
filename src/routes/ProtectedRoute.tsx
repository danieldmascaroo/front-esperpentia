import { useEffect, useRef } from "react"
import type { PropsWithChildren } from "react"
import { Navigate, useLocation } from "react-router-dom"

import { useAuth } from "@/auth/useAuth"
import { Spinner } from "@/components/ui/spinner"

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { authBootstrapped, authLoading, isAuthenticated, restoreSession } = useAuth()
  const location = useLocation()
  const restoreAttemptedRef = useRef(false)

  useEffect(() => {
    if (isAuthenticated) {
      restoreAttemptedRef.current = false
      return
    }

    if (!authLoading && !restoreAttemptedRef.current) {
      restoreAttemptedRef.current = true
      void restoreSession()
    }
  }, [authLoading, isAuthenticated, restoreSession])

  if (isAuthenticated) {
    return <>{children}</>
  }

  if (!authBootstrapped || authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-3 text-sm text-muted-foreground">
        <Spinner className="size-5" />
        <span>Cargando sesión...</span>
      </div>
    )
  }

  return <Navigate to="/login" replace state={{ from: location }} />
}

