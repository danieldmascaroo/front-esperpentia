import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

import { getBlogPostById, resolveMediaUrl } from "@/lib/api"
import type { BlogPost } from "@/pages/types"

export function BlogPostPage() {
  const { postId } = useParams<{ postId: string }>()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!postId) return
    let mounted = true
    setLoading(true)
    setError(null)

    void getBlogPostById(postId)
      .then((data) => {
        if (mounted) setPost(data)
      })
      .catch((loadError) => {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el post")
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [postId])

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando entrada...</p>
  }

  if (error || !post) {
    return <p className="text-sm text-destructive">{error ?? "Entrada no encontrada"}</p>
  }

  const mainImage = resolveMediaUrl(post.imagen_principal)

  return (
    <article className="mx-auto w-full max-w-4xl space-y-5">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{post.titulo}</h1>
        <p className="text-sm text-muted-foreground">
          {post.autor_nombre || "Autor"} {post.publicado_en ? `• ${new Date(post.publicado_en).toLocaleDateString("es-CL")}` : ""}
        </p>
      </header>

      {mainImage ? (
        <img src={mainImage} alt={post.titulo} className="h-auto w-full rounded-md border border-border/50 object-cover" />
      ) : null}

      <div className="space-y-4">
        {post.resumen ? <p className="text-base text-muted-foreground">{post.resumen}</p> : null}
        <div className="whitespace-pre-wrap text-base leading-7">{post.contenido}</div>
      </div>
    </article>
  )
}
