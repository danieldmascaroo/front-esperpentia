import { X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CatalogAuthor, CatalogGenre, CatalogPublisher } from "@/pages/types"

export type BookFilters = {
  titulo: string
  autor: string
  editorial: string
  genero: string
  destacado: "all" | "featured" | "regular"
}

type BookFiltersProps = {
  filters: BookFilters
  onFilterChange: <K extends keyof BookFilters>(key: K, value: BookFilters[K]) => void
  onReset: () => void
  authors: CatalogAuthor[]
  genres: CatalogGenre[]
  publishers: CatalogPublisher[]
  bookCount: number
  isLoading: boolean
  onClose?: () => void
}

export function BookFilters({
  filters,
  onFilterChange,
  onReset,
  authors,
  genres,
  publishers,
  bookCount,
  isLoading,
  onClose,
}: BookFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Header con close button (solo en mobile/modal) */}
      {onClose && (
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <h2 className="font-semibold">Filtros</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        {/* Búsqueda por título */}
        <label className="group flex h-11 min-w-0 items-center gap-3 border-b border-border/80 px-1 transition-colors focus-within:border-black sm:col-span-2 xl:col-span-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={filters.titulo}
            onChange={(event) => onFilterChange("titulo", event.target.value)}
            placeholder="Buscar por título"
            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>

        {/* Autor */}
        <label className="flex h-11 min-w-0 items-center border-b border-border/80 px-1 transition-colors focus-within:border-black">
          <input
            type="text"
            list="catalog-authors"
            value={filters.autor}
            onChange={(event) => onFilterChange("autor", event.target.value)}
            placeholder="Autor"
            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        <datalist id="catalog-authors">
          {authors.map((author) => (
            <option key={author.id} value={author.nombre} />
          ))}
        </datalist>

        {/* Género */}
        <label className="flex h-11 min-w-0 items-center border-b border-border/80 px-1 transition-colors focus-within:border-black">
          <input
            type="text"
            list="catalog-genres"
            value={filters.genero}
            onChange={(event) => onFilterChange("genero", event.target.value)}
            placeholder="Género"
            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        <datalist id="catalog-genres">
          {genres.map((genre) => (
            <option key={genre.id} value={genre.nombre} />
          ))}
        </datalist>

        {/* Editorial */}
        <label className="flex h-11 min-w-0 items-center border-b border-border/80 px-1 transition-colors focus-within:border-black">
          <input
            type="text"
            list="catalog-publishers"
            value={filters.editorial}
            onChange={(event) => onFilterChange("editorial", event.target.value)}
            placeholder="Editorial"
            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        <datalist id="catalog-publishers">
          {publishers.map((publisher) => (
            <option key={publisher.id} value={publisher.nombre} />
          ))}
        </datalist>

        {/* Destacado */}
        <select
          value={filters.destacado}
          onChange={(event) =>
            onFilterChange("destacado", event.target.value as BookFilters["destacado"])
          }
          className="h-11 min-w-0 border-b border-border/80 bg-transparent px-1 text-sm outline-none transition-colors focus:border-black sm:col-span-2 xl:col-span-1"
        >
          <option value="all">Todos</option>
          <option value="featured">Solo destacados</option>
          <option value="regular">Solo regulares</option>
        </select>
      </div>

      {/* Contador y botón limpiar */}
      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch">
        <div className="text-xs text-muted-foreground">
          {isLoading ? "Actualizando..." : `${bookCount} ${bookCount === 1 ? "libro" : "libros"}`}
        </div>

        <Button
          type="button"
          onClick={onReset}
          variant="outline"
          className="h-10 w-full rounded-full text-sm font-semibold sm:w-auto xl:w-full"
        >
          Limpiar
        </Button>
      </div>
    </div>
  )
}


