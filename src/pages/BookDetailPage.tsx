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

      <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <div className="mx-auto w-44 overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-sm sm:mx-0 sm:w-full">
          {imageSrc ? (
            <img src={imageSrc} alt={currentBook.nombre} className="aspect-[4/5] h-full w-full object-cover" />
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center bg-muted text-muted-foreground">
              <BookOpenText className="h-14 w-14" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-3 text-center">
            <p className="text-sm font-semibold tracking-[0.24em] uppercase text-muted-foreground">
              {currentBook.editorial.nombre}
            </p>
            <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{currentBook.nombre}</h1>
            <p className="text-lg text-muted-foreground sm:text-base">{currentBook.autor.nombre}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-[1.5rem] bg-card px-4 py-4 shadow-sm ring-1 ring-border/70">
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">
                Precio
              </p>
              <p className="mt-2 text-lg font-semibold sm:text-xl">
                {formatCurrency(currentBook.precio, currentBook.moneda)}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-card px-4 py-4 shadow-sm ring-1 ring-border/70">
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">
                Tapa
              </p>
              <p className="mt-2 text-base font-semibold">{currentBook.tipo_tapa || "N/D"}</p>
            </div>
            <div className="rounded-[1.5rem] bg-card px-4 py-4 shadow-sm ring-1 ring-border/70">
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">
                Paginas
              </p>
              <p className="mt-2 text-base font-semibold">{currentBook.cantidad_paginas ?? "N/D"}</p>
            </div>
            <div className="rounded-[1.5rem] bg-card px-4 py-4 shadow-sm ring-1 ring-border/70">
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">
                Ano
              </p>
              <p className="mt-2 text-base font-semibold">{currentBook.anio_publicacion ?? "N/D"}</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
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

          <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
            <div className="rounded-[1.5rem] bg-muted/55 px-4 py-4">
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase">genero</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{currentBook.genero.nombre}</p>
            </div>
            <div className="rounded-[1.5rem] bg-muted/55 px-4 py-4">
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase">ISBN</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{currentBook.isbn || "N/D"}</p>
            </div>
            <div className="rounded-[1.5rem] bg-muted/55 px-4 py-4">
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase">Idioma</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{currentBook.idioma || "N/D"}</p>
            </div>
            <div className="rounded-[1.5rem] bg-muted/55 px-4 py-4">
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase">Stock</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{currentBook.stock}</p>
            </div>
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




