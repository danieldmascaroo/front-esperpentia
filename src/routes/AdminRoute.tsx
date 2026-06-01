import type { PropsWithChildren } from "react"
import { Navigate } from "react-router-dom"

import { useAuth } from "@/auth/useAuth"
import { Spinner } from "@/components/ui/spinner"

export function AdminRoute({ children }: PropsWithChildren) {
  const { authBootstrapped, authLoading, user } = useAuth()

  if (!authBootstrapped || (authLoading && !user)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-3 text-sm text-muted-foreground">
        <Spinner className="size-5" />
        <span>Validando permisos...</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.is_staff && !user.is_superuser) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
