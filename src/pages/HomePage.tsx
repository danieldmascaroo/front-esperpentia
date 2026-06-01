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

  useEffect(() => {
    if (!carouselApi) return
    const timer = window.setInterval(() => {
      carouselApi.scrollNext()
    }, 5000)

    return () => {
      window.clearInterval(timer)
    }
  }, [carouselApi])

  return (
    <section className="space-y-5">
      <Carousel opts={{ loop: true }} className="mx-auto w-full max-w-5xl" setApi={setCarouselApi}>
        <CarouselContent>
          <CarouselItem>
            <section
              className="min-h-[38rem] cursor-pointer overflow-hidden rounded-md border border-border/50 bg-card p-5 sm:min-h-[42rem] sm:p-6"
              onClick={(event) => {
                const target = event.target as HTMLElement
                if (target.closest("button, a")) {
                  return
                }
                navigate("/catalogo")
              }}
            >
              <header className="mb-8 flex flex-col gap-1 text-center sm:mb-10">
                <h1 className="text-5xl font-semibold sm:text-4xl">¡Mira nuestro catálogo aquí!</h1>
              </header>
              {loading ? (
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="mx-auto h-[28rem] w-full max-w-[15rem]" />
                  ))}
                </div>
              ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : (
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                  {featuredBooks.map((book) => (
                    <div key={book.id} className="mx-auto w-full max-w-[15rem]">
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
                  <div className="relative h-[34rem] w-full bg-secondary sm:h-[42rem]">
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
                    <div className="absolute inset-x-0 bottom-0 h-[30%] bg-black/70 px-4 pt-3 text-white">
                      <h2 className="line-clamp-3 text-2xl font-semibold leading-tight sm:text-4xl">{post.titulo}</h2>
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            )
          })}
        </CarouselContent>
        <CarouselPrevious className="left-2 top-1/2 z-10 -translate-y-1/2" />
        <CarouselNext className="right-2 top-1/2 z-10 -translate-y-1/2" />
      </Carousel>
      <div className="flex items-center justify-center gap-2">
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



