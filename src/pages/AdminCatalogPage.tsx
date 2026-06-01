import { useDeferredValue, useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { BannerDiv } from "@/components/BannerDiv"
import { BookFilters, type BookFilters as BookFiltersType } from "@/components/BookFilters"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  createCatalogAuthor,
  createCatalogBook,
  createCatalogGenre,
  createCatalogPublisher,
  createCatalogWork,
  deleteCatalogBook,
  getCatalogAuthors,
  getCatalogBooks,
  getCatalogGenres,
  getCatalogPublishers,
  getCatalogWorks,
  resolveMediaUrl,
  updateCatalogBook,
} from "@/lib/api"
import type {
  CatalogAuthor,
  CatalogBook,
  CatalogBookFilters,
  CatalogGenre,
  CatalogPublisher,
  CatalogWork,
} from "@/pages/types"

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive"

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const authorSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre del autor es obligatorio."),
  slug: z.string().trim().optional(),
  biografia: z.string().trim().optional(),
  fecha_nacimiento: z.string().optional(),
  nacionalidad: z.string().trim().optional(),
  imagen: z.any().optional(),
})

type AuthorFormValues = z.infer<typeof authorSchema>

const genreSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre del género es obligatorio."),
  slug: z.string().trim().optional(),
  descripcion: z.string().trim().optional(),
})

type GenreFormValues = z.infer<typeof genreSchema>

const publisherSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre de la editorial es obligatorio."),
  slug: z.string().trim().optional(),
  descripcion: z.string().trim().optional(),
  sitio_web: z.union([z.literal(""), z.url("El sitio web no es valido.")]).optional(),
  imagen: z.any().optional(),
})

type PublisherFormValues = z.infer<typeof publisherSchema>

const workSchema = z.object({
  titulo: z.string().trim().min(1, "El titulo es obligatorio."),
  slug: z.string().trim().optional(),
  descripcion: z.string().trim().optional(),
  descripcion_corta: z.string().trim().optional(),
  fecha_publicacion: z.string().optional(),
  autor_id: z.string().min(1, "Selecciona un autor."),
  genero_id: z.string().min(1, "Selecciona un género."),
})

type WorkFormValues = z.infer<typeof workSchema>

const bookSchema = z.object({
  obra_id: z.string().min(1, "Selecciona una obra."),
  editorial_id: z.string().min(1, "Selecciona una editorial."),
  slug: z.string().trim().min(1, "El identificador web es obligatorio."),
  sku: z.string().trim().min(1, "El SKU es obligatorio."),
  descripcion: z.string().trim().optional(),
  descripcion_corta: z.string().trim().optional(),
  precio_referencia: z
    .string()
    .trim()
    .min(1, "El precio de referencia es obligatorio.")
    .refine((value) => /^\d+(\.\d+)?$/.test(value), "Ingresa un numero valido."),
  stock: z
    .string()
    .trim()
    .min(1, "El stock es obligatorio.")
    .refine((value) => /^\d+$/.test(value), "El stock debe ser un numero entero."),
  gestionar_stock: z.boolean(),
  peso_kg: z.string().trim().optional(),
  alto_cm: z.string().trim().optional(),
  ancho_cm: z.string().trim().optional(),
  largo_cm: z.string().trim().optional(),
  activo: z.boolean(),
  destacado: z.boolean(),
  tipo_tapa: z.enum(["DURA", "BLANDA"]),
  cantidad_paginas: z
    .string()
    .trim()
    .min(1, "La cantidad de paginas es obligatoria.")
    .refine((value) => /^\d+$/.test(value), "Debe ser un numero entero."),
  isbn: z.string().trim().optional(),
  idioma: z.string().trim().optional(),
  anio_publicacion: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\d{4}$/.test(value), "Ingresa un año valido de 4 digitos."),
  imagen: z.any().optional(),
})

type BookFormValues = z.infer<typeof bookSchema>

const bookEditSchema = z.object({
  slug: z.string().trim().min(1, "El identificador web es obligatorio."),
  sku: z.string().trim().min(1, "El SKU es obligatorio."),
  precio_referencia: z
    .string()
    .trim()
    .min(1, "El precio de referencia es obligatorio.")
    .refine((value) => /^\d+(\.\d+)?$/.test(value), "Ingresa un numero valido."),
  stock: z
    .string()
    .trim()
    .min(1, "El stock es obligatorio.")
    .refine((value) => /^\d+$/.test(value), "El stock debe ser un numero entero."),
  activo: z.boolean(),
  destacado: z.boolean(),
  imagen: z.any().optional(),
})

type BookEditFormValues = z.infer<typeof bookEditSchema>
type AdminBookStatusFilter = "all" | "active" | "inactive"

function fieldError(error?: { message?: string }) {
  if (!error?.message) {
    return null
  }

  return <p className="text-xs text-destructive">{error.message}</p>
}

function getFirstFile(value: unknown): File | null {
  if (typeof File !== "undefined" && value instanceof File) {
    return value
  }
  if (typeof FileList !== "undefined" && value instanceof FileList) {
    return value.length > 0 ? value.item(0) : null
  }
  if (Array.isArray(value)) {
    const first = value[0]
    if (typeof File !== "undefined" && first instanceof File) {
      return first
    }
  }
  return null
}

const defaultListFilters: BookFiltersType = {
  titulo: "",
  autor: "",
  editorial: "",
  genero: "",
  destacado: "all",
}

function buildListBookFilters(
  filters: BookFiltersType,
  statusFilter: AdminBookStatusFilter
): CatalogBookFilters {
  const activoFilter =
    statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined

  return {
    activo: activoFilter,
    titulo: filters.titulo.trim() || undefined,
    autor: filters.autor || undefined,
    editorial: filters.editorial || undefined,
    genero: filters.genero || undefined,
    destacado:
      filters.destacado === "featured" ? true : filters.destacado === "regular" ? false : undefined,
  }
}

export function AdminCatalogPage() {
  const [viewMode, setViewMode] = useState<"create" | "list">("create")
  const [authors, setAuthors] = useState<CatalogAuthor[]>([])
  const [genres, setGenres] = useState<CatalogGenre[]>([])
  const [publishers, setPublishers] = useState<CatalogPublisher[]>([])
  const [works, setWorks] = useState<CatalogWork[]>([])
  const [books, setBooks] = useState<CatalogBook[]>([])
  const [listFilters, setListFilters] = useState<BookFiltersType>(defaultListFilters)
  const [statusFilter, setStatusFilter] = useState<AdminBookStatusFilter>("all")
  const deferredTitle = useDeferredValue(listFilters.titulo)
  const [isLoadingRefs, setIsLoadingRefs] = useState(true)
  const [isLoadingBooks, setIsLoadingBooks] = useState(true)
  const [isFilterLoading, setIsFilterLoading] = useState(false)
  const [editingBookId, setEditingBookId] = useState<number | null>(null)
  const [deletingBookId, setDeletingBookId] = useState<number | null>(null)

  const authorForm = useForm<AuthorFormValues>({
    resolver: zodResolver(authorSchema),
    defaultValues: {
      nombre: "",
      slug: "",
      biografia: "",
      fecha_nacimiento: "",
      nacionalidad: "",
    },
  })

  const genreForm = useForm<GenreFormValues>({
    resolver: zodResolver(genreSchema),
    defaultValues: {
      nombre: "",
      slug: "",
      descripcion: "",
    },
  })

  const publisherForm = useForm<PublisherFormValues>({
    resolver: zodResolver(publisherSchema),
    defaultValues: {
      nombre: "",
      slug: "",
      descripcion: "",
      sitio_web: "",
    },
  })

  const workForm = useForm<WorkFormValues>({
    resolver: zodResolver(workSchema),
    defaultValues: {
      titulo: "",
      slug: "",
      descripcion: "",
      descripcion_corta: "",
      fecha_publicacion: "",
      autor_id: "",
      genero_id: "",
    },
  })

  const bookForm = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      obra_id: "",
      editorial_id: "",
      slug: "",
      sku: "",
      descripcion: "",
      descripcion_corta: "",
      precio_referencia: "",
      stock: "",
      gestionar_stock: true,
      peso_kg: "",
      alto_cm: "",
      ancho_cm: "",
      largo_cm: "",
      activo: true,
      destacado: false,
      tipo_tapa: "BLANDA",
      cantidad_paginas: "",
      isbn: "",
      idioma: "",
      anio_publicacion: "",
    },
  })

  const bookEditForm = useForm<BookEditFormValues>({
    resolver: zodResolver(bookEditSchema),
    defaultValues: {
      slug: "",
      sku: "",
      precio_referencia: "",
      stock: "",
      activo: true,
      destacado: false,
    },
  })

  async function loadReferences() {
    setIsLoadingRefs(true)
    try {
      const [authorsData, genresData, publishersData, worksData] = await Promise.all([
        getCatalogAuthors(),
        getCatalogGenres(),
        getCatalogPublishers(),
        getCatalogWorks(),
      ])
      setAuthors(authorsData)
      setGenres(genresData)
      setPublishers(publishersData)
      setWorks(worksData)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar los datos base.")
    } finally {
      setIsLoadingRefs(false)
    }
  }

  const effectiveListFilters = buildListBookFilters({ ...listFilters, titulo: deferredTitle }, statusFilter)

  async function loadBooks(nextFilters: CatalogBookFilters = effectiveListFilters, showLoading = true) {
    if (showLoading) {
      setIsLoadingBooks(true)
    } else {
      setIsFilterLoading(true)
    }

    try {
      const data = await getCatalogBooks(nextFilters)
      setBooks(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar la lista de libros.")
    } finally {
      if (showLoading) {
        setIsLoadingBooks(false)
      } else {
        setIsFilterLoading(false)
      }
    }
  }

  useEffect(() => {
    void loadReferences()
    void loadBooks()
  }, [])

  useEffect(() => {
    if (viewMode !== "list") {
      return
    }
    setEditingBookId(null)
    void loadBooks(effectiveListFilters, false)
  }, [
    viewMode,
    deferredTitle,
    listFilters.autor,
    listFilters.destacado,
    listFilters.editorial,
    listFilters.genero,
    statusFilter,
  ])

  function updateListFilter<K extends keyof BookFiltersType>(key: K, value: BookFiltersType[K]) {
    setListFilters((current) => ({ ...current, [key]: value }))
  }

  function resetListFilters() {
    setListFilters(defaultListFilters)
    setStatusFilter("all")
  }

  const submitAuthor = authorForm.handleSubmit(async (values) => {
    try {
      const imageFile = getFirstFile(values.imagen)
      await createCatalogAuthor({
        nombre: values.nombre.trim(),
        slug: values.slug?.trim() || slugify(values.nombre),
        biografia: values.biografia?.trim() ?? "",
        fecha_nacimiento: values.fecha_nacimiento || undefined,
        nacionalidad: values.nacionalidad?.trim() ?? "",
        imagen: imageFile,
      })
      toast.success("Autor creado.")
      authorForm.reset({
        nombre: "",
        slug: "",
        biografia: "",
        fecha_nacimiento: "",
        nacionalidad: "",
      })
      void loadReferences()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el autor.")
    }
  })

  const submitGenre = genreForm.handleSubmit(async (values) => {
    try {
      await createCatalogGenre({
        nombre: values.nombre.trim(),
        slug: values.slug?.trim() || slugify(values.nombre),
        descripcion: values.descripcion?.trim() ?? "",
      })
      toast.success("genero creado.")
      genreForm.reset({ nombre: "", slug: "", descripcion: "" })
      void loadReferences()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el género.")
    }
  })

  const submitPublisher = publisherForm.handleSubmit(async (values) => {
    try {
      const imageFile = getFirstFile(values.imagen)
      await createCatalogPublisher({
        nombre: values.nombre.trim(),
        slug: values.slug?.trim() || slugify(values.nombre),
        descripcion: values.descripcion?.trim() ?? "",
        sitio_web: values.sitio_web?.trim() ?? "",
        imagen: imageFile,
      })
      toast.success("Editorial creada.")
      publisherForm.reset({
        nombre: "",
        slug: "",
        descripcion: "",
        sitio_web: "",
      })
      void loadReferences()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la editorial.")
    }
  })

  const submitWork = workForm.handleSubmit(async (values) => {
    try {
      await createCatalogWork({
        titulo: values.titulo.trim(),
        slug: values.slug?.trim() || slugify(values.titulo),
        descripcion: values.descripcion?.trim() ?? "",
        descripcion_corta: values.descripcion_corta?.trim() ?? "",
        fecha_publicacion: values.fecha_publicacion || undefined,
        autor_id: Number(values.autor_id),
        genero_id: Number(values.genero_id),
      })
      toast.success("Obra creada.")
      workForm.reset({
        titulo: "",
        slug: "",
        descripcion: "",
        descripcion_corta: "",
        fecha_publicacion: "",
        autor_id: "",
        genero_id: "",
      })
      void loadReferences()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la obra.")
    }
  })

  const submitBook = bookForm.handleSubmit(async (values) => {
    try {
      const imageFile = getFirstFile(values.imagen)
      await createCatalogBook({
        obra_id: Number(values.obra_id),
        editorial_id: Number(values.editorial_id),
        slug: values.slug.trim(),
        sku: values.sku.trim(),
        descripcion: values.descripcion?.trim() ?? "",
        descripcion_corta: values.descripcion_corta?.trim() ?? "",
        precio: values.precio_referencia.trim(),
        precio_referencia: values.precio_referencia.trim(),
        moneda: "CLP",
        stock: values.stock.trim(),
        gestionar_stock: values.gestionar_stock,
        peso_kg: values.peso_kg?.trim() ?? "",
        alto_cm: values.alto_cm?.trim() ?? "",
        ancho_cm: values.ancho_cm?.trim() ?? "",
        largo_cm: values.largo_cm?.trim() ?? "",
        activo: values.activo,
        destacado: values.destacado,
        tipo_tapa: values.tipo_tapa,
        cantidad_paginas: values.cantidad_paginas.trim(),
        isbn: values.isbn?.trim() ?? "",
        idioma: values.idioma?.trim() || "es",
        anio_publicacion: values.anio_publicacion?.trim() ?? "",
        imagen: imageFile,
      })
      toast.success("Libro creado.")
      bookForm.reset({
        obra_id: "",
        editorial_id: "",
        slug: "",
        sku: "",
        descripcion: "",
        descripcion_corta: "",
        precio_referencia: "",
        stock: "",
        gestionar_stock: true,
        peso_kg: "",
        alto_cm: "",
        ancho_cm: "",
        largo_cm: "",
        activo: true,
        destacado: false,
        tipo_tapa: "BLANDA",
        cantidad_paginas: "",
        isbn: "",
        idioma: "",
        anio_publicacion: "",
      })
      void loadBooks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el libro.")
    }
  })

  function startEditingBook(book: CatalogBook) {
    setEditingBookId(book.id)
    bookEditForm.reset({
      slug: book.slug ?? "",
      sku: book.sku ?? "",
      precio_referencia: String(book.precio_referencia ?? book.precio ?? ""),
      stock: String(book.stock ?? 0),
      activo: Boolean(book.activo),
      destacado: Boolean(book.destacado),
    })
  }

  const submitBookEdit = bookEditForm.handleSubmit(async (values) => {
    if (!editingBookId) {
      return
    }
    try {
      const imageFile = getFirstFile(values.imagen)
      await updateCatalogBook(editingBookId, {
        slug: values.slug.trim(),
        sku: values.sku.trim(),
        precio: values.precio_referencia.trim(),
        precio_referencia: values.precio_referencia.trim(),
        moneda: "CLP",
        stock: values.stock.trim(),
        activo: values.activo,
        destacado: values.destacado,
        ...(imageFile ? { imagen: imageFile } : {}),
      })
      toast.success("Libro actualizado.")
      setEditingBookId(null)
      void loadBooks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el libro.")
    }
  })

  async function handleDeleteBook(book: CatalogBook) {
    if (!window.confirm(`Â¿Seguro que quieres borrar \"${book.nombre}\"?`)) {
      return
    }
    setDeletingBookId(book.id)
    try {
      await deleteCatalogBook(book.id)
      toast.success("Libro borrado.")
      if (editingBookId === book.id) {
        setEditingBookId(null)
      }
      void loadBooks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo borrar el libro.")
    } finally {
      setDeletingBookId(null)
    }
  }

  return (
    <BannerDiv
      title="Gestión DE catálogo"
      subtitle="Solo staff. Crea autores, géneros, editoriales, obras y libros."
      className="max-w-6xl"
    >
      {isLoadingRefs ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 p-3">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "create" ? "default" : "outline"}
              onClick={() => setViewMode("create")}
            >
              Crear
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
            >
              Ver lista de libros
            </Button>
          </section>

          {viewMode === "create" ? (
            <div className="space-y-8">
          <section className="space-y-3 rounded-xl border border-border/70 p-4">
            <h2 className="text-lg font-semibold">Crear Autor</h2>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={submitAuthor}>
              <div>
                <Input placeholder="Nombre" aria-invalid={authorForm.formState.errors.nombre ? "true" : "false"} {...authorForm.register("nombre")} />
                {fieldError(authorForm.formState.errors.nombre)}
              </div>
              <div>
                <Input placeholder="Identificador web (slug, opcional)" {...authorForm.register("slug")} />
              </div>
              <div className="md:col-span-2">
                <textarea
                  className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                  placeholder="biografia (opcional)"
                  {...authorForm.register("biografia")}
                />
              </div>
              <div>
                <Input type="date" placeholder="Fecha de nacimiento (opcional)" {...authorForm.register("fecha_nacimiento")} />
              </div>
              <div>
                <Input placeholder="Nacionalidad (opcional)" {...authorForm.register("nacionalidad")} />
              </div>
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm text-muted-foreground">Imagen autor (opcional)</span>
                <input type="file" accept="image/*" {...authorForm.register("imagen")} />
              </label>
              <Button type="submit" variant="submit" disabled={authorForm.formState.isSubmitting} className="md:col-span-2">
                {authorForm.formState.isSubmitting ? <Spinner className="size-4" /> : null}
                Crear autor
              </Button>
            </form>
          </section>

          <section className="space-y-3 rounded-xl border border-border/70 p-4">
            <h2 className="text-lg font-semibold">Crear género</h2>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={submitGenre}>
              <div>
                <Input placeholder="Nombre" aria-invalid={genreForm.formState.errors.nombre ? "true" : "false"} {...genreForm.register("nombre")} />
                {fieldError(genreForm.formState.errors.nombre)}
              </div>
              <div>
                <Input placeholder="Identificador web (slug, opcional)" {...genreForm.register("slug")} />
              </div>
              <div className="md:col-span-2">
                <textarea
                  className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                  placeholder="Descripcion (opcional)"
                  {...genreForm.register("descripcion")}
                />
              </div>
              <Button type="submit" variant="submit" disabled={genreForm.formState.isSubmitting} className="md:col-span-2">
                {genreForm.formState.isSubmitting ? <Spinner className="size-4" /> : null}
                Crear género
              </Button>
            </form>
          </section>

          <section className="space-y-3 rounded-xl border border-border/70 p-4">
            <h2 className="text-lg font-semibold">Crear Editorial</h2>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={submitPublisher}>
              <div>
                <Input placeholder="Nombre" aria-invalid={publisherForm.formState.errors.nombre ? "true" : "false"} {...publisherForm.register("nombre")} />
                {fieldError(publisherForm.formState.errors.nombre)}
              </div>
              <div>
                <Input placeholder="Identificador web (slug, opcional)" {...publisherForm.register("slug")} />
              </div>
              <div>
                <Input placeholder="Sitio web (opcional)" aria-invalid={publisherForm.formState.errors.sitio_web ? "true" : "false"} {...publisherForm.register("sitio_web")} />
                {fieldError(publisherForm.formState.errors.sitio_web)}
              </div>
              <div className="md:col-span-2">
                <textarea
                  className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                  placeholder="Descripcion (opcional)"
                  {...publisherForm.register("descripcion")}
                />
              </div>
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm text-muted-foreground">Imagen editorial (opcional)</span>
                <input type="file" accept="image/*" {...publisherForm.register("imagen")} />
              </label>
              <Button type="submit" variant="submit" disabled={publisherForm.formState.isSubmitting} className="md:col-span-2">
                {publisherForm.formState.isSubmitting ? <Spinner className="size-4" /> : null}
                Crear editorial
              </Button>
            </form>
          </section>

          <section className="space-y-3 rounded-xl border border-border/70 p-4">
            <h2 className="text-lg font-semibold">Crear Obra</h2>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={submitWork}>
              <div>
                <Input placeholder="Titulo" aria-invalid={workForm.formState.errors.titulo ? "true" : "false"} {...workForm.register("titulo")} />
                {fieldError(workForm.formState.errors.titulo)}
              </div>
              <div>
                <Input placeholder="Identificador web (slug, opcional)" {...workForm.register("slug")} />
              </div>
              <div>
                <select className={selectClassName} aria-invalid={workForm.formState.errors.autor_id ? "true" : "false"} {...workForm.register("autor_id")}>
                  <option value="">Selecciona autor</option>
                  {authors.map((author) => (
                    <option key={author.id} value={String(author.id)}>
                      {author.nombre}
                    </option>
                  ))}
                </select>
                {fieldError(workForm.formState.errors.autor_id)}
              </div>
              <div>
                <select className={selectClassName} aria-invalid={workForm.formState.errors.genero_id ? "true" : "false"} {...workForm.register("genero_id")}>
                  <option value="">Selecciona género</option>
                  {genres.map((genre) => (
                    <option key={genre.id} value={String(genre.id)}>
                      {genre.nombre}
                    </option>
                  ))}
                </select>
                {fieldError(workForm.formState.errors.genero_id)}
              </div>
              <div>
                <Input placeholder="Descripcion corta (opcional)" {...workForm.register("descripcion_corta")} />
              </div>
              <div>
                <Input type="date" placeholder="Fecha de publicación (opcional)" {...workForm.register("fecha_publicacion")} />
              </div>
              <div className="md:col-span-2">
                <textarea
                  className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                  placeholder="Descripcion (opcional)"
                  {...workForm.register("descripcion")}
                />
              </div>
              <Button type="submit" variant="submit" disabled={workForm.formState.isSubmitting} className="md:col-span-2">
                {workForm.formState.isSubmitting ? <Spinner className="size-4" /> : null}
                Crear obra
              </Button>
            </form>
          </section>

          <section className="space-y-3 rounded-xl border border-border/70 p-4">
            <h2 className="text-lg font-semibold">Crear Libro</h2>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={submitBook}>
              <div>
                <select className={selectClassName} aria-invalid={bookForm.formState.errors.obra_id ? "true" : "false"} {...bookForm.register("obra_id")}>
                  <option value="">Selecciona obra</option>
                  {works.map((work) => (
                    <option key={work.id} value={String(work.id)}>
                      {work.titulo}
                    </option>
                  ))}
                </select>
                {fieldError(bookForm.formState.errors.obra_id)}
              </div>
              <div>
                <select className={selectClassName} aria-invalid={bookForm.formState.errors.editorial_id ? "true" : "false"} {...bookForm.register("editorial_id")}>
                  <option value="">Selecciona editorial</option>
                  {publishers.map((publisher) => (
                    <option key={publisher.id} value={String(publisher.id)}>
                      {publisher.nombre}
                    </option>
                  ))}
                </select>
                {fieldError(bookForm.formState.errors.editorial_id)}
              </div>
              <div>
                <Input placeholder="Identificador web (slug)*" aria-invalid={bookForm.formState.errors.slug ? "true" : "false"} {...bookForm.register("slug")} />
                {fieldError(bookForm.formState.errors.slug)}
              </div>
              <div>
                <Input placeholder="SKU*" aria-invalid={bookForm.formState.errors.sku ? "true" : "false"} {...bookForm.register("sku")} />
                {fieldError(bookForm.formState.errors.sku)}
              </div>
              <div>
                <Input
                  placeholder="Precio referencia (CLP)*"
                  aria-invalid={bookForm.formState.errors.precio_referencia ? "true" : "false"}
                  {...bookForm.register("precio_referencia")}
                />
                {fieldError(bookForm.formState.errors.precio_referencia)}
              </div>
              <div>
                <Input placeholder="Stock*" aria-invalid={bookForm.formState.errors.stock ? "true" : "false"} {...bookForm.register("stock")} />
                {fieldError(bookForm.formState.errors.stock)}
              </div>
              <div>
                <select className={selectClassName} {...bookForm.register("tipo_tapa")}>
                  <option value="BLANDA">Tapa blanda</option>
                  <option value="DURA">Tapa dura</option>
                </select>
              </div>
              <div>
                <Input
                  placeholder="Cantidad paginas*"
                  aria-invalid={bookForm.formState.errors.cantidad_paginas ? "true" : "false"}
                  {...bookForm.register("cantidad_paginas")}
                />
                {fieldError(bookForm.formState.errors.cantidad_paginas)}
              </div>
              <div>
                <Input placeholder="ISBN" {...bookForm.register("isbn")} />
              </div>
              <div>
                <Input
                  placeholder="Idioma (opcional, default: es)"
                  {...bookForm.register("idioma")}
                />
              </div>
              <div>
                <Input
                  placeholder="año publicación"
                  aria-invalid={bookForm.formState.errors.anio_publicacion ? "true" : "false"}
                  {...bookForm.register("anio_publicacion")}
                />
                {fieldError(bookForm.formState.errors.anio_publicacion)}
              </div>
              <div>
                <Input placeholder="Peso kg" {...bookForm.register("peso_kg")} />
              </div>
              <div>
                <Input placeholder="Alto cm" {...bookForm.register("alto_cm")} />
              </div>
              <div>
                <Input placeholder="Ancho cm" {...bookForm.register("ancho_cm")} />
              </div>
              <div>
                <Input placeholder="Largo cm" {...bookForm.register("largo_cm")} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...bookForm.register("gestionar_stock")} />
                Gestiónar stock
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...bookForm.register("activo")} />
                Activo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...bookForm.register("destacado")} />
                Destacado
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm text-muted-foreground">Portada (upload)</span>
                <input type="file" accept="image/*" {...bookForm.register("imagen")} />
              </label>
              <div>
                <Input placeholder="Descripcion corta" {...bookForm.register("descripcion_corta")} />
              </div>
              <div className="md:col-span-2">
                <textarea
                  className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                  placeholder="Descripcion"
                  {...bookForm.register("descripcion")}
                />
              </div>
              <Button type="submit" variant="submit" disabled={bookForm.formState.isSubmitting} className="md:col-span-2">
                {bookForm.formState.isSubmitting ? <Spinner className="size-4" /> : null}
                Crear libro
              </Button>
            </form>
          </section>
            </div>
          ) : (
            <section className="space-y-3 rounded-xl border border-border/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Lista de libros</h2>
                <Button type="button" size="sm" variant="outline" onClick={() => void loadBooks(effectiveListFilters, true)}>
                  Recargar
                </Button>
              </div>

              <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)] xl:items-start">
                <aside className="space-y-4 xl:sticky xl:top-8">
                  <div className="flex flex-wrap gap-2 rounded-xl border border-border/70 p-3">
                    <Button
                      type="button"
                      variant={statusFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("all")}
                    >
                      Todos
                    </Button>
                    <Button
                      type="button"
                      variant={statusFilter === "active" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("active")}
                    >
                      Activos
                    </Button>
                    <Button
                      type="button"
                      variant={statusFilter === "inactive" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("inactive")}
                    >
                      Inactivos
                    </Button>
                  </div>

                  <BookFilters
                    filters={listFilters}
                    onFilterChange={updateListFilter}
                    onReset={resetListFilters}
                    authors={authors}
                    genres={genres}
                    publishers={publishers}
                    bookCount={books.length}
                    isLoading={isFilterLoading}
                  />
                </aside>

                {isLoadingBooks ? (
                  <div className="flex min-h-32 items-center justify-center">
                    <Spinner className="size-5 text-muted-foreground" />
                  </div>
                ) : books.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No hay libros para mostrar.
                  </p>
                ) : (
                  <div className="space-y-2">
                  {books.map((book) => (
                    <article key={book.id} className="rounded-lg border border-border/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {book.imagen ? (
                            <img
                              src={resolveMediaUrl(book.imagen) ?? undefined}
                              alt={`Portada de ${book.nombre}`}
                              className="h-14 w-10 rounded border border-border/60 object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-14 w-10 items-center justify-center rounded border border-dashed border-border/70 text-[10px] text-muted-foreground">
                              Sin portada
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{book.nombre}</p>
                            <p className="text-sm text-muted-foreground">
                            SKU: {book.sku} â€¢ Stock: {book.stock} â€¢ Ref: {book.precio_referencia ?? book.precio}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => startEditingBook(book)}>
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={deletingBookId === book.id}
                            onClick={() => void handleDeleteBook(book)}
                          >
                            {deletingBookId === book.id ? <Spinner className="size-4" /> : null}
                            Borrar
                          </Button>
                        </div>
                      </div>

                      {editingBookId === book.id ? (
                        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={submitBookEdit}>
                          <div>
                            <Input
                              placeholder="Identificador web (slug)*"
                              aria-invalid={bookEditForm.formState.errors.slug ? "true" : "false"}
                              {...bookEditForm.register("slug")}
                            />
                            {fieldError(bookEditForm.formState.errors.slug)}
                          </div>
                          <div>
                            <Input
                              placeholder="SKU*"
                              aria-invalid={bookEditForm.formState.errors.sku ? "true" : "false"}
                              {...bookEditForm.register("sku")}
                            />
                            {fieldError(bookEditForm.formState.errors.sku)}
                          </div>
                          <div>
                            <Input
                              placeholder="Precio referencia (CLP)*"
                              aria-invalid={bookEditForm.formState.errors.precio_referencia ? "true" : "false"}
                              {...bookEditForm.register("precio_referencia")}
                            />
                            {fieldError(bookEditForm.formState.errors.precio_referencia)}
                          </div>
                          <div>
                            <Input
                              placeholder="Stock*"
                              aria-invalid={bookEditForm.formState.errors.stock ? "true" : "false"}
                              {...bookEditForm.register("stock")}
                            />
                            {fieldError(bookEditForm.formState.errors.stock)}
                          </div>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" {...bookEditForm.register("activo")} />
                            Activo
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" {...bookEditForm.register("destacado")} />
                            Destacado
                          </label>
                          <label className="md:col-span-2">
                            <span className="mb-1 block text-sm text-muted-foreground">
                              Cambiar portada (opcional)
                            </span>
                            <input type="file" accept="image/*" {...bookEditForm.register("imagen")} />
                          </label>
                          <div className="md:col-span-2 flex gap-2">
                            <Button type="submit" size="sm" variant="submit" disabled={bookEditForm.formState.isSubmitting}>
                              {bookEditForm.formState.isSubmitting ? <Spinner className="size-4" /> : null}
                              Guardar cambios
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => setEditingBookId(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </form>
                      ) : null}
                    </article>
                  ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </BannerDiv>
  )
}





