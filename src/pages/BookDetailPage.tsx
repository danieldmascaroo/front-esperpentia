import { useEffect, useState } from "react"
import { ArrowLeft, BookOpenText, ShoppingCart } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { useCart } from "@/commerce/useCart"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getCatalogBookById, resolveMediaUrl } from "@/lib/api"
import { formatCurrency } from "@/lib/cart"
import type { CatalogBook } from "@/pages/types"

const LANGUAGE_LABELS: Record<string, string> = {
  es: "Español",
  en: "Inglés",
  fr: "Francés",
  de: "Alemán",
  it: "Italiano",
  pt: "Portugués",
  ca: "Catalán",
  eu: "Euskera",
  gl: "Gallego",
}

function formatLanguageLabel(language: string | null | undefined) {
  if (!language) return "N/D"
  const normalized = language.trim().toLowerCase()
  if (!normalized) return "N/D"
  return LANGUAGE_LABELS[normalized] ?? language
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <Skeleton className="mx-auto aspect-[4/5] w-44 rounded-[2rem] sm:mx-0 sm:w-full" />
      <div className="space-y-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-4/5" />
        <Skeleton className="h-5 w-1/2" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-[1.5rem]" />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  )
}

export function BookDetailPage() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const { addBookToCart, buyNow } = useCart()
  const [book, setBook] = useState<CatalogBook | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isBuyingNow, setIsBuyingNow] = useState(false)

  useEffect(() => {
    let ignore = false

    async function loadBook() {
      if (!bookId) {
        setError("Libro no encontrado")
        setIsLoading(false)
        return
      }

      try {
        const nextBook = await getCatalogBookById(bookId)

        if (ignore) {
          return
        }

        setBook(nextBook)
        setError(null)
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el libro")
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    void loadBook()

    return () => {
      ignore = true
    }
  }, [bookId])

  if (isLoading) {
    return <DetailSkeleton />
  }

  if (!book) {
    return (
      <section className="space-y-6">
        <Link
          to="/catalogo"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </Link>
        <div className="rounded-[2rem] border border-destructive/20 bg-destructive/8 px-6 py-8 text-sm text-destructive">
          {error ?? "No se pudo encontrar el libro."}
        </div>
      </section>
    )
  }

  const currentBook = book
  const imageSrc = resolveMediaUrl(currentBook.imagen)
  const description = currentBook.descripcion || currentBook.obra.descripcion || "Sin descripcion disponible."
  const shortDescription = currentBook.obra.descripcion_corta?.trim() ?? ""
  const languageLabel = formatLanguageLabel(currentBook.idioma)
  const normalizedDescription = description.trim().toLowerCase()
  const normalizedShortDescription = shortDescription.toLowerCase()
  const shouldShowShortDescription = Boolean(
    shortDescription &&
    normalizedShortDescription !== normalizedDescription &&
    !normalizedDescription.includes(normalizedShortDescription)
  )

  return (
    <section className="space-y-8">
      <Link
        to="/catalogo"
        className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground sm:text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </Link>

      <div className="grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-10 lg:items-start">
        <div className="hidden w-44 overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-sm sm:mx-0 sm:w-full lg:block">
          {imageSrc ? (
            <img src={imageSrc} alt={currentBook.nombre} className="aspect-[4/5] h-full w-full object-cover" />
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center bg-muted text-muted-foreground">
              <BookOpenText className="h-14 w-14" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="space-y-6 lg:space-y-7">
          <div className="flex items-start gap-3 lg:hidden">
            <div className="w-28 shrink-0 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
              {imageSrc ? (
                <img src={imageSrc} alt={currentBook.nombre} className="aspect-[4/5] h-full w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center bg-muted text-muted-foreground">
                  <BookOpenText className="h-10 w-10" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">
                {currentBook.editorial.nombre}
              </p>
              <h1 className="text-xl font-semibold leading-tight">{currentBook.nombre}</h1>
              <p className="text-sm text-muted-foreground">{currentBook.autor.nombre}</p>
              <p className="pt-1 text-lg font-semibold">{formatCurrency(currentBook.precio, currentBook.moneda)}</p>
              <p className="text-xs text-muted-foreground">Unidades disponibles: {currentBook.stock}</p>
            </div>
          </div>

          <div className="hidden space-y-3 text-left lg:block">
            <p className="text-sm font-semibold tracking-[0.24em] uppercase text-muted-foreground">
              {currentBook.editorial.nombre}
            </p>
            <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{currentBook.nombre}</h1>
            <p className="text-lg text-muted-foreground sm:text-base">{currentBook.autor.nombre}</p>
            <p className="pt-1 text-2xl font-semibold">{formatCurrency(currentBook.precio, currentBook.moneda)}</p>
            <p className="text-sm text-muted-foreground">Unidades disponibles: {currentBook.stock}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[1.5rem] bg-card px-4 py-4 shadow-sm ring-1 ring-border/70">
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">
                Paginas
              </p>
              <p className="mt-2 text-base font-semibold">{currentBook.cantidad_paginas ?? "N/D"}</p>
            </div>
            <div className="rounded-[1.5rem] bg-card px-4 py-4 shadow-sm ring-1 ring-border/70">
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">
                Año
              </p>
              <p className="mt-2 text-base font-semibold">{currentBook.anio_publicacion ?? "N/D"}</p>
            </div>
            <div className="rounded-[1.5rem] bg-card px-4 py-4 shadow-sm ring-1 ring-border/70">
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">
                Genero
              </p>
              <p className="mt-2 text-base font-semibold">{currentBook.genero.nombre}</p>
            </div>
            <div className="rounded-[1.5rem] bg-card px-4 py-4 shadow-sm ring-1 ring-border/70">
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">
                Idioma
              </p>
              <p className="mt-2 text-base font-semibold">{languageLabel}</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 lg:flex-row lg:items-center lg:justify-start">
            <Button
              variant="black"
              size="lg"
              className="rounded-full px-5 text-sm"
              disabled={isAdding || isBuyingNow}
              onClick={() => {
                setIsAdding(true)
                void addBookToCart(currentBook.id)
                  .then(() => {
                    toast.success("Libro agregado al carrito")
                  })
                  .catch((error) => {
                    toast.error(error instanceof Error ? error.message : "No se pudo agregar el libro al carrito")
                  })
                  .finally(() => {
                    setIsAdding(false)
                  })
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              Anadir al carrito
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-5 text-sm"
              disabled={isAdding || isBuyingNow}
              onClick={() => {
                setIsBuyingNow(true)
                void buyNow(currentBook.id)
                  .then(() => {
                    navigate("/checkout")
                  })
                  .catch((error) => {
                    toast.error(error instanceof Error ? error.message : "No se pudo preparar el carrito")
                  })
                  .finally(() => {
                    setIsBuyingNow(false)
                  })
              }}
            >
              Comprar ahora
            </Button>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold sm:text-xl">Sobre este libro</h2>
            <p className="text-base leading-8 text-muted-foreground sm:text-sm sm:leading-7">{description}</p>
            {shouldShowShortDescription ? (
              <p className="text-base leading-8 text-muted-foreground sm:text-sm sm:leading-7">{shortDescription}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}




