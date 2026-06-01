import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { toast } from "sonner"

import { getSalesByBook, getSalesByDate, getSalesSummary } from "@/api/commerceApi"
import { BannerDiv } from "@/components/BannerDiv"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { formatCurrency } from "@/lib/cart"
import type { SalesByBookPoint, SalesByDatePoint, SalesSummary } from "@/pages/types"

type PresetRange = "7d" | "30d" | "90d" | "365d"
type SalesStatusFilter = "completed" | "cancelled" | "refunded"

const CHART_COLORS = ["#111827", "#1f2937", "#374151", "#4b5563", "#6b7280", "#9ca3af"]

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getPresetDates(preset: PresetRange) {
  const end = new Date()
  const start = new Date(end)
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : preset === "90d" ? 90 : 365
  start.setDate(end.getDate() - days)
  return { start: toDateInputValue(start), end: toDateInputValue(end) }
}

function formatPeriodLabel(period: string) {
  const date = new Date(period)
  if (Number.isNaN(date.getTime())) return period
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "short" })
}

export function AdminSalesDashboardPage() {
  const [preset, setPreset] = useState<PresetRange>("30d")
  const [status, setStatus] = useState<SalesStatusFilter>("completed")
  const [currency, setCurrency] = useState("CLP")
  const [dateFrom, setDateFrom] = useState(getPresetDates("30d").start)
  const [dateTo, setDateTo] = useState(getPresetDates("30d").end)
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [salesByDate, setSalesByDate] = useState<SalesByDatePoint[]>([])
  const [salesByBook, setSalesByBook] = useState<SalesByBookPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const groupBy = useMemo(() => {
    const start = new Date(dateFrom)
    const end = new Date(dateTo)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return days > 120 ? "month" : "day"
  }, [dateFrom, dateTo])

  useEffect(() => {
    const next = getPresetDates(preset)
    setDateFrom(next.start)
    setDateTo(next.end)
  }, [preset])

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true)
      try {
        const params = { date_from: dateFrom, date_to: dateTo, status, currency }
        const [summaryData, byDateData, byBookData] = await Promise.all([
          getSalesSummary(params),
          getSalesByDate({ ...params, group_by: groupBy }),
          getSalesByBook({ ...params, limit: 10 }),
        ])
        setSummary(summaryData)
        setSalesByDate(byDateData)
        setSalesByBook(byBookData)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo cargar el dashboard de ventas.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadDashboard()
  }, [currency, dateFrom, dateTo, groupBy, status])

  const byDateChartData = useMemo(
    () =>
      salesByDate.map((row) => ({
        period: formatPeriodLabel(row.period),
        totalAmount: Number(row.total_amount),
        orders: row.orders_count,
        quantity: row.total_quantity,
      })),
    [salesByDate]
  )

  const byBookChartData = useMemo(
    () =>
      salesByBook.map((row) => ({
        name: row.libro_nombre.length > 30 ? `${row.libro_nombre.slice(0, 30)}...` : row.libro_nombre,
        grossSales: Number(row.gross_sales),
        quantity: row.total_quantity,
      })),
    [salesByBook]
  )

  const topBooksShareData = useMemo(() => {
    const total = byBookChartData.reduce((acc, item) => acc + item.grossSales, 0)
    if (!total) return []
    return byBookChartData.slice(0, 6).map((item) => ({
      name: item.name,
      value: item.grossSales,
      percent: (item.grossSales / total) * 100,
    }))
  }, [byBookChartData])

  return (
    <BannerDiv
      title="VENTAS"
      subtitle="Dashboard comercial avanzado por periodo, rendimiento y producto."
      className="max-w-7xl"
    >
      <section className="space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={preset === "7d" ? "default" : "outline"} onClick={() => setPreset("7d")}>7 dias</Button>
            <Button size="sm" variant={preset === "30d" ? "default" : "outline"} onClick={() => setPreset("30d")}>30 dias</Button>
            <Button size="sm" variant={preset === "90d" ? "default" : "outline"} onClick={() => setPreset("90d")}>90 dias</Button>
            <Button size="sm" variant={preset === "365d" ? "default" : "outline"} onClick={() => setPreset("365d")}>12 meses</Button>
          </div>
          <input className="rounded-md border border-input px-2 py-1.5 text-sm" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input className="rounded-md border border-input px-2 py-1.5 text-sm" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <select className="rounded-md border border-input px-2 py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value as SalesStatusFilter)}>
            <option value="completed">Completadas</option>
            <option value="refunded">Reembolsadas</option>
            <option value="cancelled">Canceladas</option>
          </select>
          <input
            className="w-20 rounded-md border border-input px-2 py-1.5 text-sm uppercase"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
            placeholder="CLP"
          />
        </div>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-xl border border-border/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ventas Totales</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary?.total_amount ?? "0", currency)}</p>
              </article>
              <article className="rounded-xl border border-border/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">órdenes</p>
                <p className="mt-2 text-2xl font-semibold">{(summary?.orders_count ?? 0).toLocaleString("es-CL")}</p>
              </article>
              <article className="rounded-xl border border-border/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ticket Promedio</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary?.average_order_value ?? "0", currency)}</p>
              </article>
              <article className="rounded-xl border border-border/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Libros Vendidos</p>
                <p className="mt-2 text-2xl font-semibold">{(summary?.total_quantity ?? 0).toLocaleString("es-CL")}</p>
              </article>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <article className="rounded-xl border border-border/70 p-4 xl:col-span-2">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Evolucion de ventas</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={byDateChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                      <Line type="monotone" dataKey="totalAmount" stroke="#111827" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="rounded-xl border border-border/70 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Participacion top libros</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                      <Pie data={topBooksShareData} dataKey="value" nameKey="name" outerRadius={110}>
                        {topBooksShareData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </div>

            <article className="rounded-xl border border-border/70 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top libros por ingreso bruto</h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byBookChartData} layout="vertical" margin={{ left: 24, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={220} />
                    <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                    <Bar dataKey="grossSales" fill="#111827" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </>
        )}
      </section>
    </BannerDiv>
  )
}

