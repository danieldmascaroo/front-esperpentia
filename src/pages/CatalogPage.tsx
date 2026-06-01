import { useDeferredValue, useEffect, useState, startTransition } from "react"
import { Filter } from "lucide-react"

import { BookCard, BookCardSkeleton } from "@/components/BookCard"
import { BookFilters, type BookFilters as BookFiltersType } from "@/components/BookFilters"
import { FilterModal } from "@/components/FilterModal"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  getCatalogAuthors,
  getCatalogBooksPage,
  getCatalogGenres,
  getCatalogPublishers,
} from "@/lib/api"
import type {
  CatalogAuthor,
  CatalogBook,
  CatalogBookFilters,
  CatalogGenre,
  CatalogPublisher,
} from "@/pages/types"

const defaultFilters: BookFiltersType = {
  titulo: "",
  autor: "",
  editorial: "",
  genero: "",
  destacado: "all",
}
const CATALOG_PAGE_SIZE = 15

function buildBookFilters(filters: BookFiltersType): CatalogBookFilters {
  return {
    activo: true,
    titulo: filters.titulo.trim() || undefined,
    autor: filters.autor || undefined,
    editorial: filters.editorial || undefined,
    genero: filters.genero || undefined,
    destacado:
      filters.destacado === "featured" ? true : filters.destacado === "regular" ? false : undefined,
  }
}

function EmptyState() {
  return (
    <div className="rounded-[2rem] border border-dashed border-border bg-card/70 px-6 py-16 text-center">
      <p className="text-sm font-semibold tracking-[0.28em] uppercase text-muted-foreground">
        Sin resultados
      </p>
      <h3 className="mt-3 text-2xl font-semibold">No encontramos libros para esos filtros</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Ajusta la búsqueda, cambia el género o limpia los filtros para volver a explorar.
      </p>
    </div>
  )
}

export function CatalogPage() {
  const [filters, setFilters] = useState<BookFiltersType>(defaultFilters)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const deferredTitle = useDeferredValue(filters.titulo)
  const [currentPage, setCurrentPage] = useState(1)
  const [books, setBooks] = useState<CatalogBook[]>([])
  const [authors, setAuthors] = useState<CatalogAuthor[]>([])
  const [genres, setGenres] = useState<CatalogGenre[]>([])
  const [publishers, setPublishers] = useState<CatalogPublisher[]>([])
  const [totalBooks, setTotalBooks] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isFilterLoading, setIsFilterLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCurrentPage(1)
  }, [deferredTitle, filters.autor, filters.destacado, filters.editorial, filters.genero])

  useEffect(() => {
    let ignore = false

    async function loadFilterOptions() {
      try {
        const [authorsData, genresData, publishersData] = await Promise.all([
          getCatalogAuthors(),
          getCatalogGenres(),
          getCatalogPublishers(),
        ])

        if (ignore) {
          return
        }

        setAuthors(authorsData)
        setGenres(genresData)
        setPublishers(publishersData)
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los filtros")
        }
      }
    }

    void loadFilterOptions()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false
    const firstLoad = books.length === 0 && currentPage === 1
    const nextFilters = buildBookFilters({ ...filters, titulo: deferredTitle })

    setError(null)
    if (firstLoad) {
      setIsLoading(true)
    } else {
      setIsFilterLoading(true)
    }

    async function loadBooks() {
      try {
        const pageData = await getCatalogBooksPage(nextFilters, currentPage)

        if (ignore) {
          return
        }

        setBooks(pageData.results)
        setTotalBooks(pageData.count)
        setTotalPages(Math.max(1, Math.ceil(pageData.count / CATALOG_PAGE_SIZE)))
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el catálogo")
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
          setIsFilterLoading(false)
        }
      }
    }

    void loadBooks()

    return () => {
      ignore = true
    }
  }, [
    currentPage,
    deferredTitle,
    filters.autor,
    filters.destacado,
    filters.editorial,
    filters.genero,
  ])

  function updateFilter<K extends keyof BookFiltersType>(key: K, value: BookFiltersType[K]) {
    startTransition(() => {
      setFilters((current) => ({ ...current, [key]: value }))
    })
  }

  function resetFilters() {
    startTransition(() => {
      setFilters(defaultFilters)
      setCurrentPage(1)
    })
  }

  return (
    <>
      {/* BotÃ³n de filtros flotante en mobile */}
      <button
        type="button"
        onClick={() => setIsFilterModalOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg hover:bg-black/90 transition-colors xl:hidden"
        aria-label="Abrir filtros"
      >
        <Filter className="h-5 w-5" />
      </button>

      {/* Modal de filtros para mobile */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
      >
        <BookFilters
          filters={filters}
          onFilterChange={updateFilter}
          onReset={resetFilters}
          authors={authors}
          genres={genres}
          publishers={publishers}
          bookCount={totalBooks}
          isLoading={isFilterLoading}
          onClose={() => setIsFilterModalOpen(false)}
        />
      </FilterModal>

      {/* Contenido principal */}
      <section className="grid gap-8 xl:grid-cols-[18rem_minmax(0,1fr)] xl:items-start">
        {/* Sidebar de filtros - solo visible en desktop */}
        <aside className="hidden xl:block xl:sticky xl:top-8">
          <BookFilters
            filters={filters}
            onFilterChange={updateFilter}
            onReset={resetFilters}
            authors={authors}
            genres={genres}
            publishers={publishers}
            bookCount={totalBooks}
            isLoading={isFilterLoading}
          />
        </aside>

        {/* Grid de libros */}
        {error ? (
          <div className="rounded-[2rem] border border-destructive/20 bg-destructive/8 px-6 py-5 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <BookCardSkeleton key={index} />
            ))}
          </div>
        ) : books.length > 0 ? (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>

            {totalPages > 1 ? (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      text="Anterior"
                      onClick={(event) => {
                        event.preventDefault()
                        if (currentPage > 1) {
                          setCurrentPage((previous) => previous - 1)
                        }
                      }}
                      aria-disabled={currentPage <= 1}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : undefined}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={page === currentPage}
                        onClick={(event) => {
                          event.preventDefault()
                          setCurrentPage(page)
                        }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      text="Siguiente"
                      onClick={(event) => {
                        event.preventDefault()
                        if (currentPage < totalPages) {
                          setCurrentPage((previous) => previous + 1)
                        }
                      }}
                      aria-disabled={currentPage >= totalPages}
                      className={currentPage >= totalPages ? "pointer-events-none opacity-50" : undefined}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            ) : null}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
    </>
  )
}



