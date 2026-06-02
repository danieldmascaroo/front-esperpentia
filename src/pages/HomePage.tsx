import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { BookCard } from "@/components/BookCard"
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Skeleton } from "@/components/ui/skeleton"
import { getCatalogBooks, getPublishedBlogPosts, resolveMediaUrl } from "@/lib/api"
import type { BlogPost, CatalogBook } from "@/pages/types"

export function HomePage() {
  const navigate = useNavigate()
  const [featuredBooks, setFeaturedBooks] = useState<CatalogBook[]>([])
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [snapCount, setSnapCount] = useState(0)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    void Promise.all([
      getCatalogBooks({ destacado: true, activo: true }),
      getCatalogBooks({ activo: true }),
      getPublishedBlogPosts(),
    ])
      .then(([highlightedBooks, allActiveBooks, posts]) => {
        if (!mounted) return
        const selected = highlightedBooks.slice(0, 3)
        if (selected.length < 3) {
          const existingIds = new Set(selected.map((book) => book.id))
          for (const book of allActiveBooks) {
            if (existingIds.has(book.id)) continue
            selected.push(book)
            existingIds.add(book.id)
            if (selected.length === 3) break
          }
        }
        setFeaturedBooks(selected.slice(0, 3))
        setBlogPosts(posts)
      })
      .catch((loadError) => {
        if (!mounted) return
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el inicio")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const blogSlides = useMemo(
    () =>
      blogPosts.filter((post) => Boolean(post.imagen_principal || post.imagenes[0]?.imagen)),
    [blogPosts]
  )

  useEffect(() => {
    if (!carouselApi) return

    const onSelect = () => {
      setSelectedIndex(carouselApi.selectedScrollSnap())
      setSnapCount(carouselApi.scrollSnapList().length)
    }

    onSelect()
    carouselApi.on("select", onSelect)
    carouselApi.on("reInit", onSelect)

    return () => {
      carouselApi.off("select", onSelect)
      carouselApi.off("reInit", onSelect)
    }
  }, [carouselApi])

  return (
    <section className="space-y-1 overflow-x-hidden">
      <Carousel
        opts={{ loop: true }}
        className="mx-auto w-full max-w-5xl"
        setApi={setCarouselApi}
      >
        <CarouselContent>
          <CarouselItem>
            <section
              className="min-h-[22rem] cursor-pointer overflow-hidden rounded-md border border-border/50 bg-card p-3 sm:min-h-[32rem] sm:p-5 lg:min-h-[42rem] lg:p-6"
              onClick={(event) => {
                const target = event.target as HTMLElement
                if (target.closest("button, a")) {
                  return
                }
                navigate("/catalogo")
              }}
            >
              <header className="mb-4 flex flex-col gap-1 text-center sm:mb-8">
                <h1 className="text-2xl font-semibold sm:text-4xl lg:text-5xl">¡Mira nuestro catálogo aquí!</h1>
              </header>
              {loading ? (
                <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-[11.5rem] w-full sm:mx-auto sm:h-[24rem] sm:max-w-[13rem] lg:h-[28rem] lg:max-w-[15rem]" />
                  ))}
                </div>
              ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-3">
                  {featuredBooks.map((book) => (
                    <div key={book.id} className="w-full sm:mx-auto sm:max-w-[13rem] lg:max-w-[15rem]">
                      <BookCard book={book} variant="featured" />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </CarouselItem>

          {blogSlides.map((post) => {
            const image = resolveMediaUrl(post.imagen_principal ?? post.imagenes[0]?.imagen ?? null)
            return (
              <CarouselItem key={post.id}>
                <Link
                  to={`/blog/${post.id}`}
                  className="group block overflow-hidden rounded-md border border-border/50 bg-card"
                >
                  <div className="relative h-[24rem] w-full bg-secondary sm:h-[32rem] lg:h-[42rem]">
                    {image ? (
                      <img
                        src={image}
                        alt={post.titulo}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        Sin imagen
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-[40%] bg-black/70 px-3 pt-2 text-white sm:h-[30%] sm:px-4 sm:pt-3">
                      <h2 className="line-clamp-3 text-lg font-semibold leading-tight sm:text-2xl lg:text-4xl">{post.titulo}</h2>
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            )
          })}
        </CarouselContent>
        <CarouselPrevious className="fixed left-2 top-1/2 z-30 h-10 w-10 -translate-y-1/2 border-white/80 bg-black/80 text-white shadow-lg hover:bg-black sm:left-4 sm:h-12 sm:w-12" />
        <CarouselNext className="fixed right-2 top-1/2 z-30 h-10 w-10 -translate-y-1/2 border-white/80 bg-black/80 text-white shadow-lg hover:bg-black sm:right-4 sm:h-12 sm:w-12" />
      </Carousel>
      <div className="mt-1 flex items-center justify-center gap-2">
        {Array.from({ length: snapCount }).map((_, index) => {
          const isActive = index === selectedIndex
          return (
            <button
              key={index}
              type="button"
              onClick={() => carouselApi?.scrollTo(index)}
              className={isActive ? "h-2.5 w-2.5 rounded-full bg-foreground" : "h-2.5 w-2.5 rounded-full bg-muted-foreground/40"}
              aria-label={`Ir a lámina ${index + 1}`}
              aria-current={isActive ? "true" : undefined}
            />
          )
        })}
      </div>
    </section>
  )
}



