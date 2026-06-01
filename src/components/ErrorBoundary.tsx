import { Component } from "react"
import type { ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary para capturar errores en componentes lazy-loaded
 * Muestra UI alternativa en lugar de crash silencioso
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    // Log error para debugging
    console.error("Error en boundary:", error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Algo salió mal</h1>
          <p className="text-muted-foreground">
            {this.state.error?.message || "Error desconocido"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded bg-primary px-4 py-2 text-white hover:bg-primary/90"
          >
            Reintentar
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
