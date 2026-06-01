import { useState, useCallback, memo } from "react"
import { BookOpenText, ShoppingCart } from "lucide-react"
import { motion } from "framer-motion"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { useCart } from "@/commerce/useCart"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { resolveMediaUrl } from "@/lib/api"
import { formatCurrency } from "@/lib/cart"
import { softRiseItem } from "@/lib/motion"
import type { CatalogBook } from "@/pages/types"

type BookCardProps = {
  book: CatalogBook
  variant?: "default" | "featured"
}

function getBookImage(book: CatalogBook) {
  return resolveMediaUrl(book.imagen)
}

function BookCardComponent({ book, variant = "default" }: BookCardProps) {
  const imageSrc = getBookImage(book)
  const navigate = useNavigate()
  const { addBookToCart, buyNow, cartMutationType, isCartMutating } = useCart()
  const [isAdding, setIsAdding] = useState(false)
  const [isBuyingNow, setIsBuyingNow] = useState(false)
  const isGlobalBuyingNow = isCartMutating && cartMutationType === "buy_now"
  const isGlobalAdding = isCartMutating && cartMutationType === "add"
  const shouldDisableAllButtons = isGlobalBuyingNow || isGlobalAdding || isAdding || isBuyingNow

  // Memoizar callbacks para evitar re-renders
  const handleAddToCart = useCallback(() => {
    setIsAdding(true)
    void addBookToCart(book.id)
      .then(() => {
        toast.success("Libro agregado al carrito")
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "No se pudo agregar el libro al carrito")
      })
      .finally(() => {
        setIsAdding(false)
      })
  }, [book.id, addBookToCart])

  const handleBuyNow = useCallback(() => {
    setIsBuyingNow(true)
    void buyNow(book.id)
      .then(() => {
        navigate("/checkout")
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "No se pudo preparar el carrito")
      })
      .finally(() => {
        setIsBuyingNow(false)
      })
  }, [book.id, buyNow, navigate])

  return (
    <article className="group relative flex h-auto flex-col overflow-hidden border border-border/50 bg-card transition-all duration-300 hover:border-border/80 hover:shadow-md">
      {/* Banner negro con tÃ­tulo (portada) */}
      <div
        className={
          variant === "featured"
            ? "flex h-12 items-start bg-black px-3 py-2 text-white"
            : "flex h-24 items-start bg-black px-5 py-4 text-white"
        }
      >
        <h2 className={variant === "featured" ? "line-clamp-2 text-lg font-medium leading-snug sm:text-xl" : "line-clamp-3 text-lg font-medium leading-snug sm:text-xl"}>
          {book.nombre}
        </h2>
      </div>

      {/* Imagen */}
      <div className={variant === "featured" ? "relative flex h-36 w-full shrink-0 items-center justify-center overflow-hidden bg-secondary sm:h-40" : "relative flex h-56 w-full shrink-0 items-center justify-center overflow-hidden bg-secondary sm:h-64"}>
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={book.nombre}
            className="h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-105 group-active:scale-105 group-focus-within:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">
            <BookOpenText className="h-12 w-12" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Contenido minimalista */}
      <div className={variant === "featured" ? "flex flex-1 flex-col gap-2 p-3" : "flex flex-1 flex-col gap-3 p-6"}>
        {/* InformaciÃ³n del autor */}
        <div className="flex-1">
          <p className={variant === "featured" ? "line-clamp-1 text-xs text-muted-foreground" : "text-sm text-muted-foreground line-clamp-1"}>
            {book.autor.nombre}
          </p>
        </div>

        {/* Precio */}
        <div className={variant === "featured" ? "border-t border-border/30 pt-2" : "border-t border-border/30 pt-3"}>
          <p className={variant === "featured" ? "text-base font-semibold text-foreground" : "text-lg font-semibold text-foreground"}>
            {formatCurrency(book.precio, book.moneda)}
          </p>
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-2 pt-2">
          {variant === "default" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-full rounded text-sm font-medium"
                disabled={shouldDisableAllButtons}
                onClick={handleAddToCart}
              >
                {isAdding ? <Spinner className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                {isAdding ? "Agregando..." : "Agregar"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link to={`/catalogo/${book.id}`} />}
                className="h-9 w-full rounded text-sm font-medium"
                disabled={shouldDisableAllButtons}
              >
                Detalles
              </Button>

              <button
                type="button"
                className="inline-flex w-full items-center justify-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 py-1.5"
                disabled={shouldDisableAllButtons}
                onClick={handleBuyNow}
              >
                {isBuyingNow ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  "Comprar ahora"
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="inline-flex h-9 w-full items-center justify-center rounded border border-border/60 bg-foreground text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={shouldDisableAllButtons}
                onClick={handleBuyNow}
              >
                {isBuyingNow ? <Spinner className="h-3.5 w-3.5" /> : "Comprar ahora"}
              </button>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link to={`/catalogo/${book.id}`} />}
                className="h-9 w-full rounded text-sm font-medium"
                disabled={shouldDisableAllButtons}
              >
                Ver detalles
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

// Memoizar component - solo re-renderiza si book.id cambia
export const BookCard = memo(
  BookCardComponent,
  (prev, next) => prev.book.id === next.book.id && prev.variant === next.variant
)

export function BookCardSkeleton() {
  return (
    <motion.section
      className="flex flex-col overflow-hidden border border-border/50 bg-card"
      variants={softRiseItem}
      initial="hidden"
      animate="show"
    >
      {/* Skeleton banner */}
      <div className="flex h-24 flex-col items-start bg-black px-5 py-4">
        <Skeleton className="h-5 w-full bg-white/15" />
        <Skeleton className="mt-2 h-4 w-3/4 bg-white/15" />
      </div>

      {/* Skeleton imagen */}
      <Skeleton className="h-56 w-full sm:h-64" />

      {/* Skeleton contenido */}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <Skeleton className="h-4 w-1/2" />

        <Skeleton className="h-6 w-24 border-t border-border/30 pt-3" />

        <div className="flex flex-col gap-2 pt-2">
          <Skeleton className="h-9 w-full rounded" />
          <Skeleton className="h-9 w-full rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </motion.section>
  )
}


