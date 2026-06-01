import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"

const COOKIE_CONSENT_STORAGE_KEY = "cookie_consent_accepted_v1"

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const hasAccepted = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) === "true"
    setIsVisible(!hasAccepted)
  }, [])

  function acceptCookies() {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "true")
    setIsVisible(false)
  }

  if (!isVisible) {
    return null
  }

  return (
    <section className="fixed right-4 bottom-4 left-4 z-50 mx-auto max-w-3xl rounded-xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground">
          Usamos cookies esenciales para seguridad y sesion, y otras para mejorar tu experiencia.
        </p>
        <Button variant="black" onClick={acceptCookies}>
          Aceptar cookies
        </Button>
      </div>
    </section>
  )
}
