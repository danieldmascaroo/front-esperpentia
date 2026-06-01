import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import { AuthProvider } from "./auth/AuthProvider.tsx"
import { CartProvider } from "./commerce/cart-context.tsx"
import { Toaster } from "./components/ui/sonner.tsx"
import "./index.css"
import App from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Toaster richColors position="bottom-right" />
          <App />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
