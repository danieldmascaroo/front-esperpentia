import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { getSales, updateSaleDispatchStatus } from "@/api/commerceApi"
import { BannerDiv } from "@/components/BannerDiv"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { formatCurrency } from "@/lib/cart"
import type { Sale } from "@/pages/types"

type DispatchFilter = "all" | "pending" | "done"

export function AdminDispatchPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<DispatchFilter>("all")
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({})

  async function loadSales() {
    setIsLoading(true)
    try {
      const [pending, done] = await Promise.all([
        getSales({ despachado: false, ordering: "-sold_at" }),
        getSales({ despachado: true, ordering: "-sold_at" }),
      ])
      setSales([...pending, ...done].sort((a, b) => Date.parse(b.sold_at) - Date.parse(a.sold_at)))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar la vista de despachos.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadSales()
  }, [])

  const filteredSales = useMemo(() => {
    if (activeFilter === "pending") {
      return sales.filter((sale) => !sale.despachado)
    }
    if (activeFilter === "done") {
      return sales.filter((sale) => sale.despachado)
    }
    return sales
  }, [activeFilter, sales])

  const counts = useMemo(
    () => ({
      all: sales.length,
      pending: sales.filter((sale) => !sale.despachado).length,
      done: sales.filter((sale) => sale.despachado).length,
    }),
    [sales]
  )

  async function handleToggleDispatch(sale: Sale) {
    const nextValue = !sale.despachado
    setUpdatingIds((prev) => ({ ...prev, [sale.id]: true }))

    try {
      const updated = await updateSaleDispatchStatus(sale.id, nextValue)
      setSales((prev) => prev.map((current) => (current.id === sale.id ? updated : current)))
      toast.success(nextValue ? "Pedido marcado como despachado." : "Pedido marcado como pendiente.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el despacho.")
    } finally {
      setUpdatingIds((prev) => ({ ...prev, [sale.id]: false }))
    }
  }

  return (
    <BannerDiv
      title="DESPACHOS"
      subtitle="Vista de pedidos para despacho. Solo administradores."
      className="max-w-6xl"
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          Por despachar
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
            {counts.pending}
          </span>
        </span>
        <Button
          type="button"
          variant={activeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("all")}
        >
          Todos ({counts.all})
        </Button>
        <Button
          type="button"
          variant={activeFilter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("pending")}
        >
          Por despachar ({counts.pending})
        </Button>
        <Button
          type="button"
          variant={activeFilter === "done" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("done")}
        >
          Despachados ({counts.done})
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadSales()}>
          Recargar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      ) : filteredSales.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No hay pedidos para el filtro seleccionado.
        </p>
      ) : (
        <div className="space-y-4">
          {filteredSales.map((sale) => {
            const isUpdating = Boolean(updatingIds[sale.id])
            return (
              <article key={sale.id} className="space-y-3 rounded-xl border border-border/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(sale.sold_at).toLocaleString("es-CL")} • {sale.items_count}{" "}
                      {sale.items_count === 1 ? "item" : "items"} • {sale.total_quantity}{" "}
                      {sale.total_quantity === 1 ? "libro" : "libros"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        sale.despachado
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {sale.despachado ? "Despachado" : "Pendiente"}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant={sale.despachado ? "outline" : "default"}
                      disabled={isUpdating}
                      onClick={() => void handleToggleDispatch(sale)}
                    >
                      {isUpdating ? <Spinner className="size-4" /> : null}
                      {sale.despachado ? "Marcar pendiente" : "Marcar despachado"}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="space-y-1 rounded-lg border border-border/60 p-3">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Contacto
                    </p>
                    <p>
                      {sale.contact_first_name || "-"} {sale.contact_last_name || "-"}
                    </p>
                    <p>{sale.contact_email || "-"}</p>
                    <p>{sale.contact_phone || "-"}</p>
                  </div>
                  <div className="space-y-1 rounded-lg border border-border/60 p-3">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      dirección
                    </p>
                    <p>{sale.shipping_address || "-"}</p>
                    <p>
                      {sale.shipping_city || "-"}, {sale.shipping_region || "-"}
                    </p>
                    <p>
                      CP {sale.shipping_postal_code || "-"} • {sale.shipping_country || "-"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-border/60 p-3">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Libros</p>
                  {sale.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin ítems asociados.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {sale.items.map((item) => (
                        <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                          <span>
                            {item.libro_nombre} x{item.quantity}
                          </span>
                          <span className="font-medium">{formatCurrency(item.subtotal, sale.currency)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex justify-end border-t border-border/60 pt-3 text-sm">
                  <span className="font-semibold">
                    Total venta: {formatCurrency(sale.total_amount, sale.currency)}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </BannerDiv>
  )
}



