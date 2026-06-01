import { Link, useSearchParams } from "react-router-dom"

import { BannerDiv } from "@/components/BannerDiv"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/cart"

function getStatusText(outcome: string) {
  if (outcome === "paid") {
    return {
      title: "Pago aprobado",
      description: "Tu pago con Webpay fue confirmado y tu compra quedo registrada.",
      tone: "text-emerald-600",
    }
  }

  if (outcome === "aborted") {
    return {
      title: "Pago cancelado",
      description: "Cancelaste el pago en Webpay. Puedes intentarlo nuevamente cuando quieras.",
      tone: "text-amber-600",
    }
  }

  return {
    title: "Pago no completado",
    description: "No logramos confirmar el pago con Webpay.",
    tone: "text-destructive",
  }
}

export function WebpayResultPage() {
  const [searchParams] = useSearchParams()
  const outcome = (searchParams.get("outcome") ?? "failed").toLowerCase()
  const reason = searchParams.get("reason")
  const totalAmount = searchParams.get("total_amount")
  const currency = searchParams.get("currency") ?? "CLP"
  const purchasedAt = searchParams.get("purchased_at")
  const books = searchParams.get("books")

  const statusText = getStatusText(outcome)
  const purchasedDate = purchasedAt ? new Date(purchasedAt) : null
  const hasValidDate = purchasedDate && !Number.isNaN(purchasedDate.getTime())
  const formattedDate = hasValidDate
    ? new Intl.DateTimeFormat("es-CL", { dateStyle: "full", timeStyle: "short" }).format(purchasedDate)
    : null

  return (
    <BannerDiv title="RESULTADO DEL PAGO" subtitle="Confirmación de Webpay" className="max-w-3xl">
      <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-5">
        <h2 className={`text-2xl font-semibold ${statusText.tone}`}>{statusText.title}</h2>
        <p className="text-sm text-muted-foreground">{statusText.description}</p>

        <div className="space-y-2 text-sm">
          {outcome === "paid" && books ? <p><span className="font-medium">Libro(s):</span> {books}</p> : null}
          {outcome === "paid" && formattedDate ? <p><span className="font-medium">Fecha:</span> {formattedDate}</p> : null}
          {outcome === "paid" && totalAmount ? (
            <p><span className="font-medium">Monto total:</span> {formatCurrency(totalAmount, currency)}</p>
          ) : null}
          {reason ? <p><span className="font-medium">Detalle:</span> {reason}</p> : null}
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button variant="outline" nativeButton={false} render={<Link to="/catalogo" />}>
            Volver al catálogo
          </Button>
        </div>
      </div>
    </BannerDiv>
  )
}


