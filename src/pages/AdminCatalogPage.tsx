import { useDeferredValue, useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { BookFilters, type BookFilters as BookFiltersType } from "@/components/BookFilters"
import {
  FormSection,
  formActionButtonClassName,
  formCheckboxRowClassName,
  formFileInputClassName,
  formInputClassName,
  formSectionClassName,
  formSelectClassName,
  formTextareaClassName,
  formToggleButtonClassName,
} from "@/components/form-styles"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
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

const selectClassName = formSelectClassName

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

function AdminFormField({
  children,
  error,
  className,
}: {
  children: React.ReactNode
  error?: { message?: string }
  className?: string
}) {
  return (
    <div className={className}>
      {children}
      {fieldError(error)}
    </div>
  )
}

function AdminCheckboxField({
  label,
  checked,
  onCheckedChange,
  className,
}: {
  label: string
  checked?: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}) {
  return (
    <label className={`${formCheckboxRowClassName} ${className ?? ""}`}>
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
      <span>{label}</span>
    </label>
  )
}

function AdminFileField({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs font-medium tracking-[0.22em] uppercase text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
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
    <section className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8 space-y-2">
        <p className="text-xs font-medium tracking-[0.22em] uppercase text-muted-foreground">
          Gestión de catálogo
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground">
          Administración de libros
        </h1>
        <p className="text-sm text-muted-foreground">
          Solo staff. Crea autores, géneros, editoriales, obras y libros.
        </p>
      </div>
      {isLoadingRefs ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <section className={`${formSectionClassName} flex flex-wrap items-center gap-2`}>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "create" ? "black" : "outline"}
              className={formToggleButtonClassName}
              onClick={() => setViewMode("create")}
            >
              Crear
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "list" ? "black" : "outline"}
              className={formToggleButtonClassName}
              onClick={() => setViewMode("list")}
            >
              Ver lista de libros
            </Button>
          </section>

          {viewMode === "create" ? (
            <div className="space-y-8">
              <FormSection eyebrow="Catálogo" title="Crear autor" description="Usa la misma estructura visual del login para mantener consistencia en administración.">
                <form className="grid gap-4 md:grid-cols-2" onSubmit={submitAuthor}>
                  <AdminFormField error={authorForm.formState.errors.nombre}>
                    <Input className={formInputClassName} placeholder="Nombre" aria-invalid={authorForm.formState.errors.nombre ? "true" : "false"} {...authorForm.register("nombre")} />
                  </AdminFormField>
                  <AdminFormField>
                    <Input className={formInputClassName} placeholder="Identificador web (slug, opcional)" {...authorForm.register("slug")} />
                  </AdminFormField>
                  <AdminFormField className="md:col-span-2">
                    <Textarea className={formTextareaClassName} placeholder="Biografía (opcional)" {...authorForm.register("biografia")} />
                  </AdminFormField>
                  <AdminFormField>
                    <Input className={formInputClassName} type="date" placeholder="Fecha de nacimiento (opcional)" {...authorForm.register("fecha_nacimiento")} />
                  </AdminFormField>
                  <AdminFormField>
                    <Input className={formInputClassName} placeholder="Nacionalidad (opcional)" {...authorForm.register("nacionalidad")} />
                  </AdminFormField>
                  <AdminFileField label="Imagen autor (opcional)" className="md:col-span-2">
                    <input className={formFileInputClassName} type="file" accept="image/*" {...authorForm.register("imagen")} />
                  </AdminFileField>
                  <Button type="submit" variant="black" disabled={authorForm.formState.isSubmitting} className={`md:col-span-2 ${formActionButtonClassName}`}>
                    {authorForm.formState.isSubmitting ? <Spinner className="size-4" /> : null}
                    Crear autor
                  </Button>
                </form>
              </FormSection>

              <FormSection eyebrow="Catálogo" title="Crear género">
                <form className="grid gap-4 md:grid-cols-2" onSubmit={submitGenre}>
                  <AdminFormField error={genreForm.formState.errors.nombre}>
                    <Input className={formInputClassName} placeholder="Nombre" aria-invalid={genreForm.formState.errors.nombre ? "true" : "false"} {...genreForm.register("nombre")} />
                  </AdminFormField>
                  <AdminFormField>
                    <Input className={formInputClassName} placeholder="Identificador web (slug, opcional)" {...genreForm.register("slug")} />
                  </AdminFormField>
                  <AdminFormField className="md:col-span-2">
                    <Textarea className={formTextareaClassName} placeholder="Descripción (opcional)" {...genreForm.register("descripcion")} />
                  </AdminFormField>
                  <Button type="submit" variant="black" disabled={genreForm.formState.isSubmitting} className={`md:col-span-2 ${formActionButtonClassName}`}>
                    {genreForm.formState.isSubmitting ? <Spinner className="size-4" /> : null}
                    Crear género
                  </Button>
                </form>
              </FormSection>

              <FormSection eyebrow="Catálogo" title="Crear editorial">
                <form className="grid gap-4 md:grid-cols-2" onSubmit={submitPublisher}>
                  <AdminFormField error={publisherForm.formState.errors.nombre}>
                    <Input className={formInputClassName} placeholder="Nombre" aria-invalid={publisherForm.formState.errors.nombre ? "true" : "false"} {...publisherForm.register("nombre")} />
                  </AdminFormField>
                  <AdminFormField>
                    <Input className={formInputClassName} placeholder="Identificador web (slug, opcional)" {...publisherForm.register("slug")} />
                  </AdminFormField>
                  <AdminFormField error={publisherForm.formState.errors.sitio_web}>
                    <Input className={formInputClassName} placeholder="Sitio web (opcional)" aria-invalid={publisherForm.formState.errors.sitio_web ? "true" : "false"} {...publisherForm.register("sitio_web")} />
                  </AdminFormField>
                  <AdminFormField className="md:col-span-2">
                    <Textarea className={formTextareaClassName} placeholder="Descripción (opcional)" {...publisherForm.register("descripcion")} />
                  </AdminFormField>
                  <AdminFileField label="Imagen editorial (opcional)" className="md:col-span-2">
                    <input className={formFileInputClassName} type="file" accept="image/*" {...publisherForm.register("imagen")} />
                  </AdminFileField>
                  <Button type="submit" variant="black" disabled={publisherForm.formState.isSubmitting} className={`md:col-span-2 ${formActionButtonClassName}`}>
                    {publisherForm.formState.isSubmitting ? <Spinner className="size-4" /> : null}
                    Crear editorial
                  </Button>
                </form>
              </FormSection>

              <FormSection eyebrow="Catálogo" title="Crear obra">
                <form className="grid gap-4 md:grid-cols-2" onSubmit={submitWork}>
                  <AdminFormField error={workForm.formState.errors.titulo}>
                    <Input className={formInputClassName} placeholder="Título" aria-invalid={workForm.formState.errors.titulo ? "true" : "false"} {...workForm.register("titulo")} />
                  </AdminFormField>
                  <AdminFormField>
                    <Input className={formInputClassName} placeholder="Identificador web (slug, opcional)" {...workForm.register("slug")} />
                  </AdminFormField>
                  <AdminFormField error={workForm.formState.errors.autor_id}>
                    <select className={selectClassName} aria-invalid={workForm.formState.errors.autor_id ? "true" : "false"} {...workForm.register("autor_id")}>
                      <option value="">Selecciona autor</option>
                      {authors.map((author) => (
                        <option key={author.id} value={String(author.id)}>
                          {author.nombre}
                        </option>
                      ))}
                    </select>
                  </AdminFormField>
                  <AdminFormField error={workForm.formState.errors.genero_id}>
                    <select className={selectClassName} aria-invalid={workForm.formState.errors.genero_id ? "true" : "false"} {...workForm.register("genero_id")}>
                      <option value="">Selecciona género</option>
                      {genres.map((genre) => (
                        <option key={genre.id} value={String(genre.id)}>
                          {genre.nombre}
                        </option>
                      ))}
                    </select>
                  </AdminFormField>
                  <AdminFormField>
                    <Input className={formInputClassName} placeholder="Descripción corta (opcional)" {...workForm.register("descripcion_corta")} />
                  </AdminFormField>
                  <AdminFormField>
                    <Input className={formInputClassName} type="date" placeholder="Fecha de publicación (opcional)" {...workForm.register("fecha_publicacion")} />
                  </AdminFormField>
                  <AdminFormField className="md:col-span-2">
                    <Textarea className={formTextareaClassName} placeholder="Descripción (opcional)" {...workForm.register("descripcion")} />
                  </AdminFormField>
                  <Button type="submit" variant="black" disabled={workForm.formState.isSubmitting} className={`md:col-span-2 ${formActionButtonClassName}`}>
                    {workForm.formState.isSubmitting ? <Spinner className="size-4" /> : null}
                    Crear obra
                  </Button>
                </form>
              </FormSection>

              <FormSection eyebrow="Catálogo" title="Crear libro">
                <form className="grid gap-4 md:grid-cols-2" onSubmit={submitBook}>
                  <AdminFormField error={bookForm.formState.errors.obra_id}>
                    <select className={selectClassName} aria-invalid={bookForm.formState.errors.obra_id ? "true" : "false"} {...bookForm.register("obra_id")}>
                      <option value="">Selecciona obra</option>
                      {works.map((work) => (
                        <option key={work.id} value={String(work.id)}>
                          {work.titulo}
                        </option>
                      ))}
                    </select>
                  </AdminFormField>
                  <AdminFormField error={bookForm.formState.errors.editorial_id}>
                    <select className={selectClassName} aria-invalid={bookForm.formState.errors.editorial_id ? "true" : "false"} {...bookForm.register("editorial_id")}>
                      <option value="">Selecciona editorial</option>
                      {publishers.map((publisher) => (
                        <option key={publisher.id} value={String(publisher.id)}>
                          {publisher.nombre}
                        </option>
                      ))}
                    </select>
                  </AdminFormField>
                  <AdminFormField error={bookForm.formState.errors.slug}>
                    <Input className={formInputClassName} placeholder="Identificador web (slug)*" aria-invalid={bookForm.formState.errors.slug ? "true" : "false"} {...bookForm.register("slug")} />
                  </AdminFormField>
                  <AdminFormField error={bookForm.formState.errors.sku}>
                    <Input className={formInputClassName} placeholder="SKU*" aria-invalid={bookForm.formState.errors.sku ? "true" : "false"} {...bookForm.register("sku")} />
                  </AdminFormField>
                  <AdminFormField error={bookForm.formState.errors.precio_referencia}>
                    <Input className={formInputClassName} placeholder="Precio referencia (CLP)*" aria-invalid={bookForm.formState.errors.precio_referencia ? "true" : "false"} {...bookForm.register("precio_referencia")} />
                  </AdminFormField>
                  <AdminFormField error={bookForm.formState.errors.stock}>
                    <Input className={formInputClassName} placeholder="Stock*" aria-invalid={bookForm.formState.errors.stock ? "true" : "false"} {...bookForm.register("stock")} />
                  </AdminFormField>
                  <AdminFormField>
                    <select className={selectClassName} {...bookForm.register("tipo_tapa")}>
                      <option value="BLANDA">Tapa blanda</option>
                      <option value="DURA">Tapa dura</option>
                    </select>
                  </AdminFormField>
                  <AdminFormField error={bookForm.formState.errors.cantidad_paginas}>
                    <Input className={formInputClassName} placeholder="Cantidad páginas*" aria-invalid={bookForm.formState.errors.cantidad_paginas ? "true" : "false"} {...bookForm.register("cantidad_paginas")} />
                  </AdminFormField>
                  <AdminFormField>
                    <Input className={formInputClassName} placeholder="ISBN" {...bookForm.register("isbn")} />
                  </AdminFormField>
                  <AdminFormField>
                    <Input className={formInputClassName} placeholder="Idioma (opcional, default: es)" {...bookForm.register("idioma")} />
                  </AdminFormField>
                  <AdminFormField error={bookForm.formState.errors.anio_publicacion}>
                    <Input className={formInputClassName} placeholder="Año publicación" aria-invalid={bookForm.formState.errors.anio_publicacion ? "true" : "false"} {...bookForm.register("anio_publicacion")} />
                  </AdminFormField>
                  <AdminFormField>
                    <Input className={formInputClassName} placeholder="Peso kg" {...bookForm.register("peso_kg")} />
                  </AdminFormField>
                  <AdminFormField>
                    <Input className={formInputClassName} placeholder="Alto cm" {...bookForm.register("alto_cm")} />
                  </AdminFormField>
                  <AdminFormField>
                    <Input className={formInputClassName} placeholder="Ancho cm" {...bookForm.register("ancho_cm")} />
                  </AdminFormField>
                  <AdminFormField>
                    <Input className={formInputClassName} placeholder="Largo cm" {...bookForm.register("largo_cm")} />
                  </AdminFormField>
                  <AdminCheckboxField
                    label="Gestionar stock"
                    checked={bookForm.watch("gestionar_stock")}
                    onCheckedChange={(checked) => bookForm.setValue("gestionar_stock", checked)}
                  />
                  <AdminCheckboxField
                    label="Activo"
                    checked={bookForm.watch("activo")}
                    onCheckedChange={(checked) => bookForm.setValue("activo", checked)}
                  />
                  <AdminCheckboxField
                    label="Destacado"
                    checked={bookForm.watch("destacado")}
                    onCheckedChange={(checked) => bookForm.setValue("destacado", checked)}
                  />
                  <AdminFileField label="Portada (upload)" className="md:col-span-2">
                    <input className={formFileInputClassName} type="file" accept="image/*" {...bookForm.register("imagen")} />
                  </AdminFileField>
                  <AdminFormField>
                    <Input className={formInputClassName} placeholder="Descripción corta" {...bookForm.register("descripcion_corta")} />
                  </AdminFormField>
                  <AdminFormField className="md:col-span-2">
                    <Textarea className={formTextareaClassName} placeholder="Descripción" {...bookForm.register("descripcion")} />
                  </AdminFormField>
                  <Button type="submit" variant="black" disabled={bookForm.formState.isSubmitting} className={`md:col-span-2 ${formActionButtonClassName}`}>
                    {bookForm.formState.isSubmitting ? <Spinner className="size-4" /> : null}
                    Crear libro
                  </Button>
                </form>
              </FormSection>
            </div>
          ) : (
            <section className={`${formSectionClassName} space-y-6`}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Lista de libros</h2>
                <Button type="button" size="sm" variant="outline" className={formToggleButtonClassName} onClick={() => void loadBooks(effectiveListFilters, true)}>
                  Recargar
                </Button>
              </div>

              <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)] xl:items-start">
                <aside className="space-y-4 xl:sticky xl:top-8">
                  <div className={`${formSectionClassName} flex flex-wrap gap-2`}>
                    <Button
                      type="button"
                      variant={statusFilter === "all" ? "black" : "outline"}
                      size="sm"
                      className={formToggleButtonClassName}
                      onClick={() => setStatusFilter("all")}
                    >
                      Todos
                    </Button>
                    <Button
                      type="button"
                      variant={statusFilter === "active" ? "black" : "outline"}
                      size="sm"
                      className={formToggleButtonClassName}
                      onClick={() => setStatusFilter("active")}
                    >
                      Activos
                    </Button>
                    <Button
                      type="button"
                      variant={statusFilter === "inactive" ? "black" : "outline"}
                      size="sm"
                      className={formToggleButtonClassName}
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
                    <article key={book.id} className={`${formSectionClassName} space-y-4`}>
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
                          <Button type="button" size="sm" variant="outline" className={formToggleButtonClassName} onClick={() => startEditingBook(book)}>
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className={formToggleButtonClassName}
                            disabled={deletingBookId === book.id}
                            onClick={() => void handleDeleteBook(book)}
                          >
                            {deletingBookId === book.id ? <Spinner className="size-4" /> : null}
                            Borrar
                          </Button>
                        </div>
                      </div>

                      {editingBookId === book.id ? (
                        <form className="mt-2 grid gap-4 md:grid-cols-2" onSubmit={submitBookEdit}>
                          <AdminFormField error={bookEditForm.formState.errors.slug}>
                            <Input
                              className={formInputClassName}
                              placeholder="Identificador web (slug)*"
                              aria-invalid={bookEditForm.formState.errors.slug ? "true" : "false"}
                              {...bookEditForm.register("slug")}
                            />
                          </AdminFormField>
                          <AdminFormField error={bookEditForm.formState.errors.sku}>
                            <Input
                              className={formInputClassName}
                              placeholder="SKU*"
                              aria-invalid={bookEditForm.formState.errors.sku ? "true" : "false"}
                              {...bookEditForm.register("sku")}
                            />
                          </AdminFormField>
                          <AdminFormField error={bookEditForm.formState.errors.precio_referencia}>
                            <Input
                              className={formInputClassName}
                              placeholder="Precio referencia (CLP)*"
                              aria-invalid={bookEditForm.formState.errors.precio_referencia ? "true" : "false"}
                              {...bookEditForm.register("precio_referencia")}
                            />
                          </AdminFormField>
                          <AdminFormField error={bookEditForm.formState.errors.stock}>
                            <Input
                              className={formInputClassName}
                              placeholder="Stock*"
                              aria-invalid={bookEditForm.formState.errors.stock ? "true" : "false"}
                              {...bookEditForm.register("stock")}
                            />
                          </AdminFormField>
                          <AdminCheckboxField
                            label="Activo"
                            checked={bookEditForm.watch("activo")}
                            onCheckedChange={(checked) => bookEditForm.setValue("activo", checked)}
                          />
                          <AdminCheckboxField
                            label="Destacado"
                            checked={bookEditForm.watch("destacado")}
                            onCheckedChange={(checked) => bookEditForm.setValue("destacado", checked)}
                          />
                          <AdminFileField label="Cambiar portada (opcional)" className="md:col-span-2">
                            <input className={formFileInputClassName} type="file" accept="image/*" {...bookEditForm.register("imagen")} />
                          </AdminFileField>
                          <div className="md:col-span-2 flex gap-2">
                            <Button type="submit" size="sm" variant="black" className={formToggleButtonClassName} disabled={bookEditForm.formState.isSubmitting}>
                              {bookEditForm.formState.isSubmitting ? <Spinner className="size-4" /> : null}
                              Guardar cambios
                            </Button>
                            <Button type="button" size="sm" variant="outline" className={formToggleButtonClassName} onClick={() => setEditingBookId(null)}>
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
    </section>
  )
}





