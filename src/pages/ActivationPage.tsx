import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"

import { BannerDiv } from "@/components/BannerDiv"
import { activateUser } from "@/lib/api"

export function ActivationPage() {
  const { uid = "", token = "" } = useParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Activando cuenta...")

  useEffect(() => {
    let isMounted = true

    async function runActivation() {
      try {
        await activateUser(uid, token)
        if (!isMounted) {
          return
        }
        setStatus("success")
        setMessage("Cuenta activada correctamente.")
      } catch (err) {
        if (!isMounted) {
          return
        }
        setStatus("error")
        const text = err instanceof Error ? err.message : "Error de activacion"
        setMessage(text)
      }
    }

    runActivation()

    return () => {
      isMounted = false
    }
  }, [token, uid])

  return (
    <BannerDiv title="ACTIVACION" subtitle="Estamos validando tu enlace de activacion.">
      <div className="space-y-4">
        <p className={status === "success" ? "text-emerald-600" : status === "error" ? "text-destructive" : "text-muted-foreground"}>
          {message}
        </p>
        <Link
          to="/login"
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Ir al login
        </Link>
      </div>
    </BannerDiv>
  )
}
