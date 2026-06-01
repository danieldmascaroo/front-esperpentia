import type { Cart } from "@/pages/types"

const BOOK_WEIGHT_KG = 0.5
const BOX_WEIGHT_KG = 0.2
const SHORT_BOOK_WEIGHT_KG = 0.45
const BOX_BASE_WEIGHT_KG = 0.9
const BOOKS_PER_SHIPPING_BOX = 3
const SHIPPING_BOX_DIMENSIONS_CM = {
  length: 32,
  width: 24,
  height: 14,
}

const SMALL_PACKAGE_DIMENSIONS = {
  length: 25,
  width: 18,
  height: 10,
}

const LARGE_PACKAGE_DIMENSIONS = {
  length: 32,
  width: 24,
  height: 14,
}

export function formatCurrency(value: string | number, currency = "CLP") {
  const numericValue = typeof value === "number" ? value : Number(value)

  if (Number.isNaN(numericValue)) {
    return `${currency} ${value}`
  }

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numericValue)
}

export function getCartBookCount(cart: Cart | null) {
  if (!cart) {
    return 0
  }

  return cart.items.reduce((total, item) => total + item.quantity, 0)
}

export function getCartPackage(cart: Cart | null) {
  const quantity = getCartBookCount(cart)
  const dimensions = quantity > 3 ? LARGE_PACKAGE_DIMENSIONS : SMALL_PACKAGE_DIMENSIONS
  const weight = Number((quantity * BOOK_WEIGHT_KG + BOX_WEIGHT_KG).toFixed(2))

  return {
    quantity,
    package: {
      weight,
      ...dimensions,
    },
  }
}

export function getChilexpressPackageForBooks(bookCount: number) {
  const safeBookCount = Math.max(1, Math.floor(bookCount))
  const boxCount = Math.ceil(safeBookCount / BOOKS_PER_SHIPPING_BOX)

  // Caja sobredimensionada para 3 libros cortos. Para más libros, se considera
  // una caja adicional equivalente por cada bloque de 3.
  const totalWeightKg = boxCount * (BOOKS_PER_SHIPPING_BOX * SHORT_BOOK_WEIGHT_KG + BOX_BASE_WEIGHT_KG)
  const roundedUpWeightKg = Math.ceil(totalWeightKg * 100) / 100
  const packageHeight = SHIPPING_BOX_DIMENSIONS_CM.height * boxCount

  return {
    boxCount,
    package: {
      weight: roundedUpWeightKg.toFixed(2),
      height: String(packageHeight),
      width: String(SHIPPING_BOX_DIMENSIONS_CM.width),
      length: String(SHIPPING_BOX_DIMENSIONS_CM.length),
    },
  }
}
