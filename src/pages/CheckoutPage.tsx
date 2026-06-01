import { useEffect, useState } from "react"
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { useCart } from "@/commerce/useCart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { formatCurrency } from "@/lib/cart"

function getSnapshotText(value: unknown, fallback = "N/D") {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback
}

export function CheckoutPage() {
  const {
    cart,
    cartCount,
    isCartReady,
    isCartMutating,
    addBookToCart,
    refreshCart,
    removeCartLine,
    updateCartItemQuantity,
  } = useCart()
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)

  useEffect(() => {
    if (!isCartReady || cart) {
      return
    }

    void refreshCart()
  }, [cart, isCartReady, refreshCart])

  if (!isCartReady) {
    return <div className="py-10 text-sm text-muted-foreground">Cargando carrito...</div>
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Empty className="min-h-[28rem] rounded-[2rem] border border-border/70 bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShoppingBag className="size-5" />
          </EmptyMedia>
          <EmptyTitle className="text-4xl font-semibold text-foreground">Tu carrito esta vacio</EmptyTitle>
          <EmptyDescription className="text-base">
            Agrega libros al carrito para preparar tu compra.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="black" size="lg" nativeButton={false} render={<Link to="/catalogo" />}>
            Ir al catálogo
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="rounded-[2rem]">
        <CardHeader className="border-b border-border/70 pb-4">
          <CardTitle className="text-3xl font-semibold">Carrito</CardTitle>
          <p className="text-sm text-muted-foreground">
            {cartCount} {cartCount === 1 ? "libro" : "libros"} en tu seleccion actual.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <ItemGroup>
            {cart.items.map((item) => {
              const title = getSnapshotText(item.metadata_snapshot.obra, `Libro #${item.book_id}`)
              const author = getSnapshotText(item.metadata_snapshot.autor)
              const publisher = getSnapshotText(item.metadata_snapshot.editorial)

              return (
                <Item key={item.id} variant="outline" className="rounded-[1.5rem] px-4 py-4">
                  <ItemContent>
                    <ItemTitle className="text-base">{title}</ItemTitle>
                    <ItemDescription>{author} / {publisher}</ItemDescription>
                    <p className="text-sm font-medium text-foreground">
                      {formatCurrency(item.unit_price_snapshot, cart.currency)}
                    </p>
                  </ItemContent>
                  <ItemActions className="ml-auto flex-wrap justify-end">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={async () => {
                        setUpdatingItemId(item.id)
                        try {
                          if (item.quantity <= 1) {
                            await removeCartLine(item.id)
                          } else {
                            await updateCartItemQuantity(item.id, item.quantity - 1)
                          }
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "No se pudo actualizar el carrito")
                        } finally {
                          setUpdatingItemId(null)
                        }
                      }}
                      disabled={isCartMutating && updatingItemId === item.id}
                      aria-label="Reducir cantidad"
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={async () => {
                        setUpdatingItemId(item.id)
                        try {
                          await addBookToCart(item.book_id, 1)
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "No se pudo actualizar el carrito")
                        } finally {
                          setUpdatingItemId(null)
                        }
                      }}
                      disabled={isCartMutating && updatingItemId === item.id}
                      aria-label="Aumentar cantidad"
                    >
                      <Plus className="size-4" />
                    </Button>
                    <span className="min-w-24 text-right text-sm font-semibold">
                      {formatCurrency(item.subtotal, cart.currency)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={async () => {
                        setUpdatingItemId(item.id)
                        try {
                          await removeCartLine(item.id)
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "No se pudo eliminar el item")
                        } finally {
                          setUpdatingItemId(null)
                        }
                      }}
                      disabled={isCartMutating && updatingItemId === item.id}
                      aria-label="Eliminar item"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </ItemActions>
                </Item>
              )
            })}
          </ItemGroup>
        </CardContent>
      </Card>

      <Card className="h-fit rounded-[2rem]">
        <CardHeader className="border-b border-border/70 pb-4">
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(cart.subtotal_amount, cart.currency)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border/70 pt-3 text-base">
            <span className="font-semibold">Total</span>
            <span className="font-semibold">{formatCurrency(cart.total_amount, cart.currency)}</span>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button
            variant="black"
            size="lg"
            nativeButton={false}
            render={<Link to="/checkout/entrega" />}
          >
            Comprar
          </Button>
        </CardFooter>
      </Card>
    </section>
  )
}


