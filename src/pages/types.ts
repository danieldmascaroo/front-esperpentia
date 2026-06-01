// Tipos usados por la pagina de registro y su formulario dependiente de region/comuna.

export type RegisterPayload = {
  email: string
  nombre: string
  apellido: string
  telefono: string
  direccion_entrega: string
  region_id: number
  comuna_id: number
  password: string
  re_password: string
}

export type Region = {
  id: number
  nombre: string
}

export type Comuna = {
  id: number
  nombre: string
  region_id: number
  county_code?: string
}

export type ComunaResponse = {
  id: number
  nombre: string
  county_code?: string
  region: Region
}

export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type AuthCredentials = {
  email: string
  password: string
}

export type AuthProfileUpdatePayload = {
  nombre?: string
  apellido?: string
  telefono?: string
  direccion_entrega?: string
  region_id?: number
  comuna_id?: number
}

export type AuthUser = {
  id: number | string
  email: string
  nombre?: string
  apellido?: string
  telefono?: string
  is_active?: boolean
  is_staff?: boolean
  is_superuser?: boolean
  direccion_entrega?: string
  region?: Region
  region_id?: number
  comuna?: ComunaResponse
  comuna_id?: number
}

export type CatalogAuthor = {
  id: number
  nombre: string
  slug: string
  imagen?: string | null
  fecha_nacimiento?: string | null
  nacionalidad?: string
  biografia: string
}

export type CatalogGenre = {
  id: number
  nombre: string
  slug: string
  descripcion: string
}

export type CatalogPublisher = {
  id: number
  nombre: string
  slug: string
  imagen?: string | null
  descripcion: string
  sitio_web: string
}

export type CatalogWork = {
  id: number
  titulo: string
  slug: string
  descripcion: string
  descripcion_corta: string
  fecha_publicacion?: string | null
  autor: CatalogAuthor
  genero: CatalogGenre
  creado_en: string
  actualizado_en: string
}

export type CatalogBook = {
  id: number
  nombre: string
  slug: string
  sku: string
  imagen: string | null
  descripcion: string
  descripcion_corta: string
  precio: string
  precio_referencia: string | null
  moneda: string
  stock: number
  gestionar_stock: boolean
  peso_kg: string | null
  alto_cm: string | null
  ancho_cm: string | null
  largo_cm: string | null
  activo: boolean
  destacado: boolean
  obra: CatalogWork
  autor: CatalogAuthor
  genero: CatalogGenre
  editorial: CatalogPublisher
  tipo_tapa: string
  cantidad_paginas: number | null
  isbn: string
  idioma: string
  anio_publicacion: number | null
  creado_en: string
  actualizado_en: string
}

export type CatalogBookFilters = {
  titulo?: string
  autor?: string
  editorial?: string
  genero?: string
  tipo_tapa?: string
  destacado?: boolean
  activo?: boolean
}

export type BlogPostImage = {
  id: number
  imagen: string
  alt_text: string
  orden: number
  creado_en: string
}

export type BlogPost = {
  id: number
  titulo: string
  slug: string
  resumen: string
  contenido: string
  imagen_principal: string | null
  status: "draft" | "published" | string
  publicado_en: string | null
  autor_nombre: string
  imagenes: BlogPostImage[]
  creado_en: string
  actualizado_en: string
}

export type CartDiscountType = "percent" | "fixed" | "qty_promo" | "coupon"

export type CartDiscount = {
  id: string
  code: string
  type: CartDiscountType
  value: string
  amount: string
  metadata: Record<string, unknown>
  description: string
}

export type CartTaxLine = {
  id: string
  name: string
  rate: string
  taxable_base: string
  amount: string
}

export type CartItem = {
  id: string
  book_id: number
  quantity: number
  unit_price_snapshot: string
  subtotal: string
  metadata_snapshot: Record<string, unknown>
}

export type Cart = {
  id: string
  user_id: number | string | null
  guest_token: string | null
  status: string
  currency: string
  subtotal_amount: string
  discount_amount: string
  tax_amount: string
  total_amount: string
  version: number
  converted_at: string | null
  created_at: string
  updated_at: string
  items: CartItem[]
  discounts: CartDiscount[]
  tax_lines: CartTaxLine[]
}

export type CartConversionResult = {
  cart: Cart
  order_id: string
  sale_id: string
  order_status: string
}

export type CartConvertPayload = {
  contact_first_name?: string
  contact_last_name?: string
  contact_email?: string
  contact_phone?: string
  shipping_address?: string
  shipping_city?: string
  shipping_region?: string
  shipping_postal_code?: string
  shipping_country?: string
}

export type SaleItem = {
  id: string
  libro_id: number | null
  libro_nombre: string
  autor_nombre: string
  editorial_nombre: string
  genero_nombre: string
  isbn: string
  idioma: string
  unit_price: string
  quantity: number
  subtotal: string
  sold_at: string
}

export type Sale = {
  id: string
  cart_id: string
  user_id: number | string | null
  guest_token: string | null
  status: string
  despachado: boolean
  contact_first_name: string
  contact_last_name: string
  contact_email: string
  contact_phone: string
  shipping_address: string
  shipping_city: string
  shipping_region: string
  shipping_postal_code: string
  shipping_country: string
  currency: string
  subtotal_amount: string
  discount_amount: string
  tax_amount: string
  total_amount: string
  items_count: number
  total_quantity: number
  sold_at: string
  items: SaleItem[]
}

export type SalesSummary = {
  orders_count: number
  total_subtotal: string
  total_discount: string
  total_tax: string
  total_amount: string
  total_items: number
  total_quantity: number
  average_order_value: string
}

export type SalesByDatePoint = {
  period: string
  orders_count: number
  total_amount: string
  total_quantity: number
}

export type SalesByBookPoint = {
  libro_id: number | null
  libro_nombre: string
  total_quantity: number
  gross_sales: string
  lines: number
  authors_count: number
}

export type CartResolvePayload = {
  guest_token?: string
  currency?: string
}

export type CartAddItemPayload = {
  book_id: number
  quantity: number
}

export type CartUpdateItemPayload = {
  quantity: number
}

export type CartApplyDiscountPayload = {
  type: CartDiscountType
  value?: string
  code?: string
  metadata?: Record<string, unknown>
}

export type Order = {
  id: string
  sale_id: string
  status: string
  currency: string
  subtotal_amount: string
  discount_amount: string
  tax_amount: string
  total_amount: string
  created_at: string
  updated_at: string
}

export type ShippingMethod = {
  id: string | number
  name: string
  price: string
  region: string
  active: boolean
}

export type CustomerAddress = {
  id: string | number
  address: string
  city: string
  region: string
  country: string
  postal_code: string
}

export type CustomerAddressPayload = {
  address: string
  city: string
  region: string
  country: string
  postal_code: string
}

export type PaymentIntent = {
  payment_id: string
  provider: string
  provider_reference: string
  client_secret?: string
  token?: string
  redirect_url?: string
  redirect_method?: "POST" | "GET" | string
  webpay_url?: string
  amount: string
  currency: string
  status: string
  sandbox?: boolean
}

export type WebpayCommitResponse = {
  payment: {
    id: string
    order: string
    provider: string
    provider_reference: string
    amount: string
    currency: string
    status: string
    created_at: string
    updated_at: string
  }
  webpay: Record<string, unknown>
}





