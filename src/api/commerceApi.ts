import axios from "axios"

import { api } from "@/api/client"
import { buildHumanApiErrorMessage } from "@/lib/human-errors"
import type {
  Cart,
  CartAddItemPayload,
  CartApplyDiscountPayload,
  CartConversionResult,
  CartConvertPayload,
  CartResolvePayload,
  Sale,
  SalesByBookPoint,
  SalesByDatePoint,
  SalesSummary,
  CartUpdateItemPayload,
  CustomerAddress,
  CustomerAddressPayload,
  Order,
  PaginatedResponse,
  PaymentIntent,
  ShippingMethod,
  WebpayCommitResponse,
} from "@/pages/types"

const GUEST_TOKEN_STORAGE_KEY = "esperpentia_guest_token"

function createIdempotencyKey(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function buildApiErrorMessage(error: unknown, fallback: string) {
  return buildHumanApiErrorMessage(error, fallback)
}

function normalizePaginatedData<T>(data: PaginatedResponse<T> | T[]) {
  return Array.isArray(data) ? data : data.results
}

export function getOrCreateGuestToken() {
  if (typeof window === "undefined") {
    return "guest-ssr"
  }

  const existingToken = window.localStorage.getItem(GUEST_TOKEN_STORAGE_KEY)
  if (existingToken) {
    return existingToken
  }

  const nextToken = `guest-${crypto.randomUUID()}`
  window.localStorage.setItem(GUEST_TOKEN_STORAGE_KEY, nextToken)
  return nextToken
}

function buildGuestHeaders(guestToken?: string) {
  return guestToken ? { "X-Guest-Token": guestToken } : undefined
}

function buildMutationHeaders(guestToken?: string, operation = "cart") {
  return {
    ...buildGuestHeaders(guestToken),
    "Idempotency-Key": createIdempotencyKey(operation),
  }
}

export async function resolveCart(payload: CartResolvePayload = {}) {
  try {
    const body = {
      ...(payload.guest_token ? { guest_token: payload.guest_token } : {}),
      currency: payload.currency ?? "CLP",
    }
    const { data } = await api.post<Cart>("/checkout/carts/resolve/", body)
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo resolver el carrito"))
  }
}

export async function getCurrentCart(guestToken?: string) {
  try {
    const { data } = await api.get<Cart>("/checkout/carts/current/", {
      headers: buildGuestHeaders(guestToken),
    })
    return data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null
    }
    throw new Error(buildApiErrorMessage(error, "No se pudo cargar el carrito actual"))
  }
}

export async function addCartItem(cartId: string, payload: CartAddItemPayload, guestToken?: string) {
  try {
    const { data } = await api.post<Cart>(`/checkout/carts/${cartId}/add-item/`, payload, {
      headers: buildMutationHeaders(guestToken, "add-item"),
    })
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo agregar el libro al carrito"))
  }
}

export async function updateCartItem(
  cartId: string,
  itemId: string,
  payload: CartUpdateItemPayload,
  guestToken?: string
) {
  try {
    const { data } = await api.patch<Cart>(`/checkout/carts/${cartId}/items/${itemId}/`, payload, {
      headers: buildMutationHeaders(guestToken, "update-item"),
    })
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo actualizar el item del carrito"))
  }
}

export async function removeCartItem(cartId: string, itemId: string, guestToken?: string) {
  try {
    const { data } = await api.delete<Cart>(`/checkout/carts/${cartId}/items/${itemId}/`, {
      headers: buildMutationHeaders(guestToken, "remove-item"),
    })
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo eliminar el item del carrito"))
  }
}

export async function applyCartDiscount(
  cartId: string,
  payload: CartApplyDiscountPayload,
  guestToken?: string
) {
  try {
    const { data } = await api.post<Cart>(`/checkout/carts/${cartId}/apply-discount/`, payload, {
      headers: buildMutationHeaders(guestToken, "apply-discount"),
    })
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo aplicar el descuento"))
  }
}

export async function recalculateCart(cartId: string, guestToken?: string) {
  try {
    const { data } = await api.post<Cart>(
      `/checkout/carts/${cartId}/recalculate/`,
      undefined,
      { headers: buildMutationHeaders(guestToken, "recalculate") }
    )
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo recalcular el carrito"))
  }
}

export async function convertCart(cartId: string, guestToken?: string, payload?: CartConvertPayload) {
  try {
    const { data } = await api.post<CartConversionResult>(
      `/checkout/carts/${cartId}/convert/`,
      payload ?? {},
      { headers: buildMutationHeaders(guestToken, "convert") }
    )
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo convertir el carrito en orden"))
  }
}

export async function getMyOrders() {
  try {
    const { data } = await api.get<PaginatedResponse<Order> | Order[]>("/orders/me/")
    return normalizePaginatedData(data)
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudieron cargar las órdenes"))
  }
}

export async function getOrder(orderId: string) {
  try {
    const { data } = await api.get<Order>(`/orders/${orderId}/`)
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo cargar la orden"))
  }
}

export async function getShippingMethods() {
  try {
    const { data } = await api.get<PaginatedResponse<ShippingMethod> | ShippingMethod[]>("/shipping/methods/")
    return normalizePaginatedData(data)
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudieron cargar los métodos de envío"))
  }
}

export async function getCustomerAddresses() {
  try {
    const { data } = await api.get<PaginatedResponse<CustomerAddress> | CustomerAddress[]>("/shipping/address/")
    return normalizePaginatedData(data)
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudieron cargar las direcciónes"))
  }
}

export async function createCustomerAddress(payload: CustomerAddressPayload) {
  try {
    const { data } = await api.post<CustomerAddress>("/shipping/address/", payload)
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo crear la dirección"))
  }
}

export async function createPaymentIntent(
  orderId: string,
  provider: "mockpay" | "webpay" = "webpay",
  guestToken?: string
) {
  try {
    const { data } = await api.post<PaymentIntent>("/payments/create-intent/", {
      order_id: orderId,
      provider,
      ...(guestToken ? { guest_token: guestToken } : {}),
    }, {
      headers: buildGuestHeaders(guestToken),
    })
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo crear el intento de pago"))
  }
}

export async function commitWebpay(tokenWs: string) {
  try {
    const { data } = await api.post<WebpayCommitResponse>("/payments/webpay/commit/", {
      token_ws: tokenWs,
    })
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo confirmar el pago en Webpay"))
  }
}

export async function getWebpayStatus(tokenWs: string) {
  try {
    const { data } = await api.get<Record<string, unknown>>("/payments/webpay/status/", {
      params: { token_ws: tokenWs },
    })
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo consultar el estado de Webpay"))
  }
}

export async function refundWebpay(tokenWs: string, amount: string) {
  try {
    const { data } = await api.post<WebpayCommitResponse>("/payments/webpay/refund/", {
      token_ws: tokenWs,
      amount,
    })
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo solicitar el reembolso"))
  }
}

type SalesQueryParams = {
  despachado?: boolean
  ordering?: string
}

type SalesStatsQueryParams = {
  date_from?: string
  date_to?: string
  status?: "completed" | "cancelled" | "refunded"
  currency?: string
}

export async function getSales(params: SalesQueryParams = {}) {
  try {
    const searchParams = new URLSearchParams()
    if (typeof params.despachado === "boolean") {
      searchParams.set("despachado", params.despachado ? "true" : "false")
    }
    if (params.ordering) {
      searchParams.set("ordering", params.ordering)
    }

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/ventas/?${queryString}` : "/ventas/"
    const { data } = await api.get<PaginatedResponse<Sale> | Sale[]>(endpoint)
    return normalizePaginatedData(data)
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudieron cargar las ventas para despacho"))
  }
}

export async function updateSaleDispatchStatus(saleId: string, despachado: boolean) {
  try {
    const { data } = await api.patch<Sale>(
      `/ventas/${saleId}/dispatch-status/`,
      { despachado },
      { headers: { "Idempotency-Key": createIdempotencyKey("dispatch-status") } }
    )
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo actualizar el estado de despacho"))
  }
}

function buildSalesStatsSearchParams(params: SalesStatsQueryParams = {}) {
  const searchParams = new URLSearchParams()
  if (params.date_from) searchParams.set("date_from", params.date_from)
  if (params.date_to) searchParams.set("date_to", params.date_to)
  if (params.status) searchParams.set("status", params.status)
  if (params.currency) searchParams.set("currency", params.currency)
  return searchParams
}

export async function getSalesSummary(params: SalesStatsQueryParams = {}) {
  try {
    const queryString = buildSalesStatsSearchParams(params).toString()
    const endpoint = queryString ? `/ventas/stats/summary/?${queryString}` : "/ventas/stats/summary/"
    const { data } = await api.get<SalesSummary>(endpoint)
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo cargar el resumen de ventas"))
  }
}

export async function getSalesByDate(
  params: SalesStatsQueryParams & { group_by?: "day" | "month" } = {}
) {
  try {
    const searchParams = buildSalesStatsSearchParams(params)
    searchParams.set("group_by", params.group_by ?? "day")
    const { data } = await api.get<SalesByDatePoint[]>(`/ventas/stats/by-date/?${searchParams.toString()}`)
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo cargar la evoluciÃ³n temporal de ventas"))
  }
}

export async function getSalesByBook(
  params: SalesStatsQueryParams & { limit?: number } = {}
) {
  try {
    const searchParams = buildSalesStatsSearchParams(params)
    searchParams.set("limit", String(params.limit ?? 12))
    const { data } = await api.get<SalesByBookPoint[]>(`/ventas/stats/by-book/?${searchParams.toString()}`)
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo cargar el anÃ¡lisis por libro"))
  }
}




