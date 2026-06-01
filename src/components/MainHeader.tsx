import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, Menu, ShoppingCart, UserRound } from "lucide-react"
import { Fragment, useEffect, useRef, useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"

import { useAuth } from "@/auth/useAuth"
import { getSales } from "@/api/commerceApi"
import { useCart } from "@/commerce/useCart"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLogout } from "@/hooks/useLogout"
import { getPublishedBlogPosts } from "@/lib/api"
import type { BlogPost } from "@/pages/types"

const links = [
  { to: "/", label: "Inicio" },
  { to: "/catalogo", label: "Catálogo" },
]

export function MainHeader() {
  const { isAuthenticated, user } = useAuth()
  const { cartCount } = useCart()
  const { logout } = useLogout()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobileNewsOpen, setIsMobileNewsOpen] = useState(false)
  const [pendingDispatchCount, setPendingDispatchCount] = useState(0)
  const [newsPosts, setNewsPosts] = useState<BlogPost[]>([])
  const [isNewsLoading, setIsNewsLoading] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null)
  const mobileMenuPanelRef = useRef<HTMLDivElement | null>(null)
  const isAdmin = Boolean(user?.is_staff || user?.is_superuser)
  const navLinks = isAdmin
    ? [...links, { to: "/admin/catalogo", label: "Gestión" }, { to: "/admin/despachos", label: "Despachos" }, { to: "/admin/ventas", label: "Ventas" }]
    : links

  useEffect(() => {
    setIsMobileMenuOpen(false)
    setIsMobileNewsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isMobileMenuOpen) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      const clickedButton = mobileMenuButtonRef.current?.contains(target)
      const clickedPanel = mobileMenuPanelRef.current?.contains(target)
      if (!clickedButton && !clickedPanel) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      setPendingDispatchCount(0)
      return
    }

    let active = true
    void getSales({ despachado: false })
      .then((pendingSales) => {
        if (!active) return
        setPendingDispatchCount(pendingSales.length)
      })
      .catch(() => {
        if (!active) return
        setPendingDispatchCount(0)
      })

    return () => {
      active = false
    }
  }, [isAuthenticated, isAdmin, location.pathname])

  useEffect(() => {
    let active = true
    setIsNewsLoading(true)

    void getPublishedBlogPosts()
      .then((posts) => {
        if (!active) return
        setNewsPosts(posts)
      })
      .catch(() => {
        if (!active) return
        setNewsPosts([])
      })
      .finally(() => {
        if (!active) return
        setIsNewsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleMobileNavigate = (to: string) => {
    navigate(to)
    setIsMobileMenuOpen(false)
  }

  const handleMobileLogout = () => {
    logout()
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="relative w-full border-b border-white/10 bg-black text-white">
      <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex flex-col leading-none">
          <span
            className="inline-block border border-white px-3 py-1 text-xl font-semibold tracking-wide uppercase"
            style={{ fontFamily: '"Arial Narrow", Arial, sans-serif' }}
          >
            Esperpentia
          </span>
        </Link>
        <nav className="hidden items-center gap-3 text-sm md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `transition-colors ${isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"}`
              }
            >
              <span className="inline-flex items-center gap-2">
                {link.label}
                {link.to === "/admin/despachos" && pendingDispatchCount > 0 ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-black">
                    {pendingDispatchCount > 99 ? "99+" : pendingDispatchCount}
                  </span>
                ) : null}
              </span>
            </NavLink>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto gap-1 bg-transparent px-0 text-sm text-zinc-400 transition-colors hover:bg-transparent hover:text-zinc-200 focus-visible:bg-transparent focus-visible:text-zinc-200 data-[state=open]:!bg-transparent data-[state=open]:!text-zinc-400 aria-[expanded=true]:!bg-transparent aria-[expanded=true]:!text-zinc-400"
                >
                  Noticias
                  <ChevronDown className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-72 border-white/10 bg-black p-1 text-white ring-white/10">
              {isNewsLoading ? (
                <DropdownMenuItem
                  disabled
                  className="rounded-sm px-2 py-2 text-zinc-400 focus:bg-transparent focus:text-zinc-400"
                >
                  Cargando noticias...
                </DropdownMenuItem>
              ) : newsPosts.length > 0 ? (
                newsPosts.map((post, index) => (
                  <Fragment key={post.id}>
                    <DropdownMenuItem
                      className="cursor-pointer rounded-sm px-2 py-2 leading-snug text-white focus:bg-white/10 focus:text-white"
                      onClick={() => navigate(`/blog/${post.id}`)}
                    >
                      <span className="line-clamp-2">{post.titulo}</span>
                    </DropdownMenuItem>
                    {index < newsPosts.length - 1 ? <DropdownMenuSeparator className="bg-white/10" /> : null}
                  </Fragment>
                ))
              ) : (
                <DropdownMenuItem
                  disabled
                  className="rounded-sm px-2 py-2 text-zinc-400 focus:bg-transparent focus:text-zinc-400"
                >
                  No hay noticias publicadas
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link to="/checkout" />}
            className="gap-2 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <ShoppingCart className="size-4" />
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-black">
              {cartCount}
            </span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:text-white"
                  aria-label="Opciones de usuario"
                >
                  <UserRound className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-44 bg-black text-white ring-white/10">
              {isAuthenticated ? (
                <>
                  <DropdownMenuItem
                    className="justify-center text-center text-white focus:bg-white/10 focus:text-white"
                    onClick={() => navigate("/cuenta")}
                  >
                    Cuenta
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    className="flex justify-center p-0 focus:bg-transparent"
                  >
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="mx-auto justify-center bg-destructive px-4 !text-white hover:bg-destructive/90 hover:!text-white focus-visible:border-destructive/40 focus-visible:ring-destructive/20 focus-visible:!text-white"
                      onClick={logout}
                    >
                      Cerrar sesión
                    </Button>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    className="justify-center text-center text-white focus:bg-white/10 focus:text-white"
                    onClick={() => navigate("/login")}
                  >
                    Iniciar sesión
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    className="justify-center text-center text-white focus:bg-white/10 focus:text-white"
                    onClick={() => navigate("/registro")}
                  >
                    Registrarse
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link to="/checkout" />}
            className="gap-2 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            aria-label="Ir al carrito"
          >
            <ShoppingCart className="size-4" />
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-black">
              {cartCount}
            </span>
          </Button>
          <Button
            ref={mobileMenuButtonRef}
            type="button"
            variant="outline"
            size="icon-sm"
            className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:text-white"
            aria-label="Abrir menu"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>
      <AnimatePresence>
        {isMobileMenuOpen ? (
          <motion.div
            ref={mobileMenuPanelRef}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full left-0 z-50 w-full border-t border-white/10 bg-black/95 backdrop-blur md:hidden"
          >
            <nav className="mx-auto flex w-full max-w-[90rem] flex-col gap-2 px-4 py-3 sm:px-6">
              {navLinks.map((link) => (
                <button
                  key={link.to}
                  type="button"
                  className="rounded-md px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/10"
                  onClick={() => handleMobileNavigate(link.to)}
                >
                  <span className="inline-flex items-center gap-2">
                    {link.label}
                    {link.to === "/admin/despachos" && pendingDispatchCount > 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-black">
                        {pendingDispatchCount > 99 ? "99+" : pendingDispatchCount}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
              <button
                type="button"
                className="rounded-md px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/10"
                onClick={() => setIsMobileNewsOpen((prev) => !prev)}
              >
                <span className="inline-flex items-center gap-2">
                  Noticias
                  <ChevronDown className={`size-4 transition-transform ${isMobileNewsOpen ? "rotate-180" : ""}`} />
                </span>
              </button>
              {isMobileNewsOpen ? (
                <div className="space-y-1 px-3">
                  {isNewsLoading ? (
                    <p className="py-1 text-xs text-zinc-400">Cargando noticias...</p>
                  ) : newsPosts.length > 0 ? (
                    newsPosts.map((post) => (
                      <button
                        key={post.id}
                        type="button"
                        className="block w-full rounded-md px-2 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                        onClick={() => handleMobileNavigate(`/blog/${post.id}`)}
                      >
                        {post.titulo}
                      </button>
                    ))
                  ) : (
                    <p className="py-1 text-xs text-zinc-400">No hay noticias publicadas</p>
                  )}
                </div>
              ) : null}
              <div className="my-1 h-px w-full bg-white/10" />
              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    className="rounded-md px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/10"
                    onClick={() => handleMobileNavigate("/cuenta")}
                  >
                    Cuenta
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/10"
                    onClick={handleMobileLogout}
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="rounded-md px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/10"
                    onClick={() => handleMobileNavigate("/login")}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/10"
                    onClick={() => handleMobileNavigate("/registro")}
                  >
                    Registrarse
                  </button>
                </>
              )}
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}


