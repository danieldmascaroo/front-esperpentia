import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Estrategia de code splitting para cargar chunks bajo demanda
        // vendor: librerías externas principales
        // ui: componentes de UI y animaciones
        // pages: contenido de páginas lazy-loaded
        manualChunks(id) {
          // Vendor libraries - cargadas en bundle principal
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router')) {
            return 'vendor'
          }
          
          // UI libraries - cargadas bajo demanda
          if (id.includes('node_modules/framer-motion') ||
              id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/sonner')) {
            return 'ui'
          }
          
          // axios para API calls
          if (id.includes('node_modules/axios')) {
            return 'vendor'
          }
        },
      },
    },
    // Optimizaciones
    minify: 'terser',
    cssCodeSplit: true,
    sourcemap: false,
    target: 'ES2020',
  },
})
