import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react"

import {
  addCartItem,
  getCurrentCart,
  getOrCreateGuestToken,
  removeCartItem,
  resolveCart,
  updateCartItem,
} from "@/api/commerceApi"
import { useAuth } from "@/auth/useAuth"
import { getCartBookCount } from "@/lib/cart"
import type { Cart } from "@/pages/types"

type CartContextValue = {
  cart: Cart | null
  cartCount: number
  isCartReady: boolean
  isCartMutating: boolean
  cartMutationType: "add" | "update" | "remove" | "buy_now" | null
  refreshCart: () => Promise<Cart | null>
  addBookToCart: (bookId: number, quantity?: number) => Promise<Cart>
  updateCartItemQuantity: (itemId: string, quantity: number) => Promise<Cart>
  removeCartLine: (itemId: string) => Promise<Cart>
  buyNow: (bookId: number) => Promise<Cart>
}

export const CartContext = createContext<CartContextValue | null>(null)

function isCartActive(cart: Cart | null) {
  return cart?.status === "active"
}

export function CartProvider({ children }: PropsWithChildren) {
  const { isAuthenticated } = useAuth()
  const [cart, setCart] = useState<Cart | null>(null)
  const [isCartReady, setIsCartReady] = useState(false)
  const [isCartMutating, setIsCartMutating] = useState(false)
  const [cartMutationType, setCartMutationType] = useState<CartContextValue["cartMutationType"]>(null)
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve())

  const getSessionGuestToken = useCallback(() => {
    if (isAuthenticated) {
      return undefined
    }
    return getOrCreateGuestToken()
  }, [isAuthenticated])

  const refreshCart = useCallback(async () => {
    const nextCart = await getCurrentCart(getSessionGuestToken())
    setCart(nextCart)
    return nextCart
  }, [getSessionGuestToken])

  useEffect(() => {
    let active = true
    setIsCartReady(false)

    void refreshCart()
      .catch(() => {
        if (active) {
          setCart(null)
        }
      })
      .finally(() => {
        if (active) {
          setIsCartReady(true)
        }
      })

    return () => {
      active = false
    }
  }, [refreshCart])

  const runCartMutation = useCallback(async <T,>(
    mutationType: NonNullable<CartContextValue["cartMutationType"]>,
    mutation: () => Promise<T>,
  ) => {
    const previous = mutationQueueRef.current
    let releaseQueue = () => {}
    mutationQueueRef.current = new Promise<void>((resolve) => {
      releaseQueue = resolve
    })

    await previous.catch(() => undefined)
    setIsCartMutating(true)
    setCartMutationType(mutationType)

    try {
      return await mutation()
    } finally {
      releaseQueue()
      setIsCartMutating(false)
      setCartMutationType(null)
    }
  }, [])

  const ensureCart = useCallback(async (): Promise<Cart> => {
    if (isCartActive(cart)) {
      return cart as Cart
    }

    const guestToken = getSessionGuestToken()
    const nextCart = await resolveCart({
      ...(guestToken ? { guest_token: guestToken } : {}),
      currency: "CLP",
    })
    setCart(nextCart)
    return nextCart
  }, [cart, getSessionGuestToken])

  const addBookToCart = useCallback(async (bookId: number, quantity = 1) => {
    return runCartMutation("add", async () => {
      const activeCart = await ensureCart()
      const nextCart = await addCartItem(
        activeCart.id,
        { book_id: bookId, quantity },
        getSessionGuestToken()
      )
      setCart(nextCart)
      return nextCart
    })
  }, [ensureCart, getSessionGuestToken, runCartMutation])

  const updateCartItemQuantity = useCallback(async (itemId: string, quantity: number) => {
    return runCartMutation("update", async () => {
      const activeCart = await ensureCart()
      const nextCart = await updateCartItem(
        activeCart.id,
        itemId,
        { quantity },
        getSessionGuestToken()
      )
      setCart(nextCart)
      return nextCart
    })
  }, [ensureCart, getSessionGuestToken, runCartMutation])

  const removeCartLine = useCallback(async (itemId: string) => {
    return runCartMutation("remove", async () => {
      const activeCart = await ensureCart()
      const nextCart = await removeCartItem(activeCart.id, itemId, getSessionGuestToken())
      setCart(nextCart)
      return nextCart
    })
  }, [ensureCart, getSessionGuestToken, runCartMutation])

  const buyNow = useCallback(async (bookId: number) => {
    return runCartMutation("buy_now", async () => {
      const activeCart = await ensureCart()
      let workingCart: Cart = activeCart

      for (const item of workingCart.items) {
        if (item.book_id !== bookId) {
          workingCart = await removeCartItem(workingCart.id, item.id, getSessionGuestToken())
        }
      }

      const selectedItem = workingCart.items.find((item) => item.book_id === bookId)

      if (!selectedItem) {
        workingCart = await addCartItem(
          workingCart.id,
          { book_id: bookId, quantity: 1 },
          getSessionGuestToken()
        )
      } else if (selectedItem.quantity !== 1) {
        workingCart = await updateCartItem(
          workingCart.id,
          selectedItem.id,
          { quantity: 1 },
          getSessionGuestToken()
        )
      }

      setCart(workingCart)
      return workingCart
    })
  }, [ensureCart, getSessionGuestToken, runCartMutation])

  const value = useMemo<CartContextValue>(() => ({
    cart,
    cartCount: getCartBookCount(cart),
    isCartReady,
    isCartMutating,
    cartMutationType,
    refreshCart,
    addBookToCart,
    updateCartItemQuantity,
    removeCartLine,
    buyNow,
  }), [addBookToCart, buyNow, cart, cartMutationType, isCartMutating, isCartReady, refreshCart, removeCartLine, updateCartItemQuantity])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
