import { api } from "@/api/client"
import { buildHumanApiErrorMessage } from "@/lib/human-errors"
import { queryCache } from "@/lib/query-cache"
import type {
  CatalogAuthor,
  BlogPost,
  CatalogBook,
  CatalogBookFilters,
  CatalogGenre,
  CatalogPublisher,
  CatalogWork,
  Comuna,
  ComunaResponse,
  PaginatedResponse,
  RegisterPayload,
  Region,
} from "@/pages/types"

const LOCAL_BACKEND_URL = "http://localhost:8000"
const PRODUCTION_PROXY_BASE_URL = "/api"

function isLocalFrontendHost() {
  if (typeof window === "undefined") {
    return import.meta.env.DEV
  }

  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
}

function resolveApiBaseUrl() {
  if (import.meta.env.DEV || isLocalFrontendHost()) {
    return LOCAL_BACKEND_URL
  }

  const raw = (import.meta.env.VITE_API_BASE_URL ?? "").trim()
  if (!raw) return PRODUCTION_PROXY_BASE_URL
  return raw
}

const API_BASE_URL = resolveApiBaseUrl()

function buildApiErrorMessage(error: unknown, fallback: string) {
  return buildHumanApiErrorMessage(error, fallback)
}

function isPaginatedResponse<T>(data: PaginatedResponse<T> | T[]): data is PaginatedResponse<T> {
  return !Array.isArray(data)
}

function toPaginatedResponse<T>(data: PaginatedResponse<T> | T[]): PaginatedResponse<T> {
  if (isPaginatedResponse(data)) {
    return data
  }

  return {
    count: data.length,
    next: null,
    previous: null,
    results: data,
  }
}

async function fetchAllPages<T>(url: string, params?: Record<string, unknown>) {
  const firstResponse = await api.get<PaginatedResponse<T> | T[]>(url, { params })
  const firstData = firstResponse.data

  if (!isPaginatedResponse(firstData)) {
    return firstData
  }

  const results = [...firstData.results]
  let nextPage = firstData.next ? 2 : null

  while (nextPage) {
    const { data } = await api.get<PaginatedResponse<T> | T[]>(url, {
      params: {
        ...(params ?? {}),
        page: nextPage,
      },
    })

    if (!isPaginatedResponse(data)) {
      results.push(...data)
      break
    }

    results.push(...data.results)
    nextPage = data.next ? nextPage + 1 : null
  }

  return results
}

function buildQueryParams(filters: CatalogBookFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== "")
  )
}

export function resolveMediaUrl(path: string | null) {
  if (!path) {
    return null
  }

  // Compatibilidad: algunos registros guardaron URLs externas en ImageField
  // y DRF las serializa como /media/https%3A/... o http://host/media/https%3A/...
  const encodedMediaMarker = "/media/"
  const encodedIndex = path.indexOf(encodedMediaMarker)
  if (encodedIndex >= 0) {
    const encodedTail = path.slice(encodedIndex + encodedMediaMarker.length)
    if (encodedTail.startsWith("http%3A/") || encodedTail.startsWith("https%3A/")) {
      const decoded = decodeURIComponent(encodedTail)
      const normalized = decoded
        .replace(/^https:\//, "https://")
        .replace(/^http:\//, "http://")

      if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
        return normalized
      }
    }
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

export async function registerUser(payload: RegisterPayload) {
  try {
    const { data } = await api.post("/auth/users/", payload, { skipAuthRefresh: true })
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "Error creando usuario"))
  }
}

export async function activateUser(uid: string, token: string) {
  try {
    const { data } = await api.post("/auth/users/activation/", { uid, token }, { skipAuthRefresh: true })
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo activar la cuenta"))
  }
}

export async function getRegions() {
  try {
    return await fetchAllPages<Region>("/users/regiones/")
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudieron cargar las regiones"))
  }
}

export async function getComunas(regionId: number) {
  try {
    const data = await fetchAllPages<ComunaResponse>("/users/comunas/", { region_id: regionId })
    return data.map((comuna): Comuna => ({
      id: comuna.id,
      nombre: comuna.nombre,
      region_id: comuna.region.id,
      county_code: comuna.county_code,
    }))
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudieron cargar las comunas"))
  }
}

export async function getCatalogBooks(filters: CatalogBookFilters) {
  // Generar clave de cachÃ© basada en filtros
  const cacheKey = `books:${JSON.stringify(filters)}`

  return queryCache.getOrFetch(cacheKey, async () => {
    try {
      return await fetchAllPages<CatalogBook>("/catalog/books/", buildQueryParams(filters))
    } catch (error) {
      throw new Error(buildApiErrorMessage(error, "No se pudo cargar el catálogo"))
    }
  })
}

export async function getCatalogBooksPage(filters: CatalogBookFilters, page = 1) {
  const cacheKey = `books:page:${page}:${JSON.stringify(filters)}`

  return queryCache.getOrFetch(cacheKey, async () => {
    try {
      const { data } = await api.get<PaginatedResponse<CatalogBook> | CatalogBook[]>("/catalog/books/", {
        params: {
          ...buildQueryParams(filters),
          page,
        },
      })
      return toPaginatedResponse(data)
    } catch (error) {
      throw new Error(buildApiErrorMessage(error, "No se pudo cargar el catálogo"))
    }
  })
}

export async function getCatalogBookById(bookId: number | string) {
  const cacheKey = `book:${bookId}`

  return queryCache.getOrFetch(cacheKey, async () => {
    try {
      const { data } = await api.get<CatalogBook>(`/catalog/books/${bookId}/`)
      return data
    } catch (error) {
      throw new Error(buildApiErrorMessage(error, "No se pudo cargar el libro"))
    }
  })
}

export async function getCatalogAuthors() {
  const cacheKey = "authors:all"

  return queryCache.getOrFetch(cacheKey, async () => {
    try {
      return await fetchAllPages<CatalogAuthor>("/catalog/authors/")
    } catch (error) {
      throw new Error(buildApiErrorMessage(error, "No se pudieron cargar los autores"))
    }
  })
}

export async function getCatalogGenres() {
  const cacheKey = "genres:all"

  return queryCache.getOrFetch(cacheKey, async () => {
    try {
      return await fetchAllPages<CatalogGenre>("/catalog/genres/")
    } catch (error) {
      throw new Error(buildApiErrorMessage(error, "No se pudieron cargar los géneros"))
    }
  })
}

export async function getCatalogPublishers() {
  const cacheKey = "publishers:all"

  return queryCache.getOrFetch(cacheKey, async () => {
    try {
      return await fetchAllPages<CatalogPublisher>("/catalog/publishers/")
    } catch (error) {
      throw new Error(buildApiErrorMessage(error, "No se pudieron cargar las editoriales"))
    }
  })
}

export async function getCatalogWorks() {
  const cacheKey = "works:all"

  return queryCache.getOrFetch(cacheKey, async () => {
    try {
      return await fetchAllPages<CatalogWork>("/catalog/works/")
    } catch (error) {
      throw new Error(buildApiErrorMessage(error, "No se pudieron cargar las obras"))
    }
  })
}

export async function createCatalogAuthor(payload: {
  nombre: string
  slug: string
  biografia?: string
  fecha_nacimiento?: string
  nacionalidad?: string
  imagen?: File | null
}) {
  try {
    const formData = new FormData()
    formData.append("nombre", payload.nombre)
    formData.append("slug", payload.slug)
    formData.append("biografia", payload.biografia ?? "")
    formData.append("fecha_nacimiento", payload.fecha_nacimiento ?? "")
    formData.append("nacionalidad", payload.nacionalidad ?? "")
    if (payload.imagen) {
      formData.append("imagen", payload.imagen)
    }
    const { data } = await api.post<CatalogAuthor>("/catalog/authors/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    queryCache.invalidate("authors:all")
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo crear el autor"))
  }
}

export async function createCatalogGenre(payload: { nombre: string; slug: string; descripcion?: string }) {
  try {
    const { data } = await api.post<CatalogGenre>("/catalog/genres/", payload)
    queryCache.invalidate("genres:all")
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo crear el género"))
  }
}

export async function createCatalogPublisher(payload: {
  nombre: string
  slug: string
  descripcion?: string
  sitio_web?: string
  imagen?: File | null
}) {
  try {
    const formData = new FormData()
    formData.append("nombre", payload.nombre)
    formData.append("slug", payload.slug)
    formData.append("descripcion", payload.descripcion ?? "")
    formData.append("sitio_web", payload.sitio_web ?? "")
    if (payload.imagen) {
      formData.append("imagen", payload.imagen)
    }
    const { data } = await api.post<CatalogPublisher>("/catalog/publishers/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    queryCache.invalidate("publishers:all")
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo crear la editorial"))
  }
}

export async function createCatalogWork(payload: {
  titulo: string
  slug: string
  descripcion?: string
  descripcion_corta?: string
  fecha_publicacion?: string
  autor_id: number
  genero_id: number
}) {
  try {
    const { data } = await api.post<CatalogWork>("/catalog/works/", payload)
    queryCache.invalidate("works:all")
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo crear la obra"))
  }
}

type CreateCatalogBookPayload = {
  slug: string
  sku: string
  descripcion?: string
  descripcion_corta?: string
  precio: string | number
  precio_referencia?: string | number
  moneda?: string
  stock: string | number
  gestionar_stock?: boolean
  peso_kg?: string | number
  alto_cm?: string | number
  ancho_cm?: string | number
  largo_cm?: string | number
  activo?: boolean
  destacado?: boolean
  obra_id: number
  editorial_id: number
  tipo_tapa: "DURA" | "BLANDA"
  cantidad_paginas: string | number
  isbn?: string
  idioma?: string
  anio_publicacion?: string | number
  imagen?: File | null
}

export async function createCatalogBook(payload: CreateCatalogBookPayload) {
  try {
    const formData = new FormData()
    formData.append("slug", payload.slug)
    formData.append("sku", payload.sku)
    formData.append("precio", String(payload.precio))
    formData.append("stock", String(payload.stock))
    formData.append("moneda", payload.moneda ?? "CLP")
    formData.append("obra_id", String(payload.obra_id))
    formData.append("editorial_id", String(payload.editorial_id))
    formData.append("tipo_tapa", payload.tipo_tapa)
    formData.append("cantidad_paginas", String(payload.cantidad_paginas))
    formData.append("gestionar_stock", String(payload.gestionar_stock ?? true).toLowerCase())
    formData.append("activo", String(payload.activo ?? true).toLowerCase())
    formData.append("destacado", String(payload.destacado ?? false).toLowerCase())
    formData.append("descripcion", payload.descripcion ?? "")
    formData.append("descripcion_corta", payload.descripcion_corta ?? "")
    formData.append("isbn", payload.isbn ?? "")
    formData.append("idioma", payload.idioma ?? "es")

    if (payload.precio_referencia !== undefined && payload.precio_referencia !== "") {
      formData.append("precio_referencia", String(payload.precio_referencia))
    }
    if (payload.peso_kg !== undefined && payload.peso_kg !== "") {
      formData.append("peso_kg", String(payload.peso_kg))
    }
    if (payload.alto_cm !== undefined && payload.alto_cm !== "") {
      formData.append("alto_cm", String(payload.alto_cm))
    }
    if (payload.ancho_cm !== undefined && payload.ancho_cm !== "") {
      formData.append("ancho_cm", String(payload.ancho_cm))
    }
    if (payload.largo_cm !== undefined && payload.largo_cm !== "") {
      formData.append("largo_cm", String(payload.largo_cm))
    }
    if (payload.anio_publicacion !== undefined && payload.anio_publicacion !== "") {
      formData.append("anio_publicacion", String(payload.anio_publicacion))
    }
    if (payload.imagen) {
      formData.append("imagen", payload.imagen)
    }

    const { data } = await api.post<CatalogBook>("/catalog/books/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    queryCache.invalidate("books:")
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo crear el libro"))
  }
}

type UpdateCatalogBookPayload = Partial<CreateCatalogBookPayload>

export async function updateCatalogBook(bookId: number | string, payload: UpdateCatalogBookPayload) {
  try {
    const formData = new FormData()

    if (payload.slug !== undefined) formData.append("slug", payload.slug)
    if (payload.sku !== undefined) formData.append("sku", payload.sku)
    if (payload.precio !== undefined) formData.append("precio", String(payload.precio))
    if (payload.precio_referencia !== undefined) formData.append("precio_referencia", String(payload.precio_referencia))
    if (payload.moneda !== undefined) formData.append("moneda", payload.moneda)
    if (payload.stock !== undefined) formData.append("stock", String(payload.stock))
    if (payload.obra_id !== undefined) formData.append("obra_id", String(payload.obra_id))
    if (payload.editorial_id !== undefined) formData.append("editorial_id", String(payload.editorial_id))
    if (payload.tipo_tapa !== undefined) formData.append("tipo_tapa", payload.tipo_tapa)
    if (payload.cantidad_paginas !== undefined) formData.append("cantidad_paginas", String(payload.cantidad_paginas))
    if (payload.descripcion !== undefined) formData.append("descripcion", payload.descripcion)
    if (payload.descripcion_corta !== undefined) formData.append("descripcion_corta", payload.descripcion_corta)
    if (payload.isbn !== undefined) formData.append("isbn", payload.isbn)
    if (payload.idioma !== undefined) formData.append("idioma", payload.idioma)
    if (payload.anio_publicacion !== undefined) formData.append("anio_publicacion", String(payload.anio_publicacion))
    if (payload.gestionar_stock !== undefined) formData.append("gestionar_stock", String(payload.gestionar_stock).toLowerCase())
    if (payload.activo !== undefined) formData.append("activo", String(payload.activo).toLowerCase())
    if (payload.destacado !== undefined) formData.append("destacado", String(payload.destacado).toLowerCase())
    if (payload.peso_kg !== undefined) formData.append("peso_kg", String(payload.peso_kg))
    if (payload.alto_cm !== undefined) formData.append("alto_cm", String(payload.alto_cm))
    if (payload.ancho_cm !== undefined) formData.append("ancho_cm", String(payload.ancho_cm))
    if (payload.largo_cm !== undefined) formData.append("largo_cm", String(payload.largo_cm))
    if (typeof File !== "undefined" && payload.imagen instanceof File) {
      formData.append("imagen", payload.imagen)
    }

    const { data } = await api.patch<CatalogBook>(`/catalog/books/${bookId}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    queryCache.invalidate("books:")
    return data
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo actualizar el libro"))
  }
}

export async function deleteCatalogBook(bookId: number | string) {
  try {
    await api.delete(`/catalog/books/${bookId}/`)
    queryCache.invalidate("books:")
  } catch (error) {
    throw new Error(buildApiErrorMessage(error, "No se pudo borrar el libro"))
  }
}

export async function getPublishedBlogPosts() {
  const cacheKey = "blog:posts:published"
  return queryCache.getOrFetch(cacheKey, async () => {
    try {
      return await fetchAllPages<BlogPost>("/blog/posts/")
    } catch (error) {
      throw new Error(buildApiErrorMessage(error, "No se pudieron cargar las entradas del blog"))
    }
  })
}

export async function getBlogPostById(postId: number | string) {
  const cacheKey = `blog:post:${postId}`
  return queryCache.getOrFetch(cacheKey, async () => {
    try {
      const { data } = await api.get<BlogPost>(`/blog/posts/${postId}/`)
      return data
    } catch (error) {
      throw new Error(buildApiErrorMessage(error, "No se pudo cargar la entrada del blog"))
    }
  })
}










