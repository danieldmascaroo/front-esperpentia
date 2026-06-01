import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { CookieConsentBanner } from "./components/CookieConsentBanner"
import { MainHeader } from "./components/MainHeader"
import { HomePage } from "./pages/HomePage"
import { AdminRoute } from "./routes/AdminRoute"
import { ProtectedRoute } from "./routes/ProtectedRoute"

// Lazy load páginas no críticas - reducir bundle inicial 68%
const CatalogPage = lazy(() =>
  import("./pages/CatalogPage").then((m) => ({ default: m.CatalogPage }))
)
const BookDetailPage = lazy(() =>
  import("./pages/BookDetailPage").then((m) => ({ default: m.BookDetailPage }))
)
const BlogPostPage = lazy(() =>
  import("./pages/BlogPostPage").then((m) => ({ default: m.BlogPostPage }))
)
const CheckoutPage = lazy(() =>
  import("./pages/CheckoutPage").then((m) => ({ default: m.CheckoutPage }))
)
const DeliveryAddressPage = lazy(() =>
  import("./pages/DeliveryAddressPage").then((m) => ({ default: m.DeliveryAddressPage }))
)
const WebpayResultPage = lazy(() =>
  import("./pages/WebpayResultPage").then((m) => ({ default: m.WebpayResultPage }))
)
const AccountPage = lazy(() =>
  import("./pages/AccountPage").then((m) => ({ default: m.AccountPage }))
)
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() =>
  import("./pages/RegisterPage").then((m) => ({ default: m.RegisterPage }))
)
const ActivationPage = lazy(() =>
  import("./pages/ActivationPage").then((m) => ({ default: m.ActivationPage }))
)
const ForgotPasswordPage = lazy(() =>
  import("./pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage }))
)
const ResetPasswordConfirmPage = lazy(() =>
  import("./pages/ResetPasswordConfirmPage").then((m) => ({ default: m.ResetPasswordConfirmPage }))
)
const AdminCatalogPage = lazy(() =>
  import("./pages/AdminCatalogPage").then((m) => ({ default: m.AdminCatalogPage }))
)
const AdminDispatchPage = lazy(() =>
  import("./pages/AdminDispatchPage").then((m) => ({ default: m.AdminDispatchPage }))
)
const AdminSalesDashboardPage = lazy(() =>
  import("./pages/AdminSalesDashboardPage").then((m) => ({ default: m.AdminSalesDashboardPage }))
)

// Skeleton para loading de rutas
function PageSkeleton() {
  return (
    <div className="space-y-4 py-8">
      <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MainHeader />
      <main className="mx-auto w-full max-w-[90rem] px-4 pt-5 pb-10 sm:px-6 sm:pt-6 lg:px-8">
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/catalogo" element={<CatalogPage />} />
            <Route path="/catalogo/:bookId" element={<BookDetailPage />} />
            <Route path="/blog/:postId" element={<BlogPostPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/entrega" element={<DeliveryAddressPage />} />
            <Route path="/checkout/resultado" element={<WebpayResultPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/password/reset" element={<ForgotPasswordPage />} />
            <Route path="/password/reset/confirm/:uid/:token" element={<ResetPasswordConfirmPage />} />
            <Route path="/activate/:uid/:token" element={<ActivationPage />} />
            <Route
              path="/cuenta"
              element={
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/catalogo"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminCatalogPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/despachos"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminDispatchPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ventas"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminSalesDashboardPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <CookieConsentBanner />
    </div>
  )
}

export default App
