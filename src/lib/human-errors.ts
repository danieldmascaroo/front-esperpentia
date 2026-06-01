import axios from "axios"

const fieldLabels: Record<string, string> = {
  email: "el email",
  password: "la contraseña",
  re_password: "la confirmación de contraseña",
  new_password: "la nueva contraseña",
  re_new_password: "la confirmación de la nueva contraseña",
  current_password: "la contraseña actual",
  token: "el enlace de recuperación",
  uid: "el enlace de recuperación",
  detail: "la solicitud",
}

function toCleanSentence(text: string) {
  const value = text.trim()
  if (!value) return ""
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function mapKnownMessage(message: string) {
  const normalized = message.trim().toLowerCase()

  if (normalized.includes("no active account found")) {
    return "El email o la contraseña no coinciden."
  }
  if (normalized.includes("credentials were not provided")) {
    return "Debes iniciar sesión para continuar."
  }
  if (normalized.includes("token is invalid") || normalized.includes("given token not valid")) {
    return "El enlace no es válido o ya venció. Solicita uno nuevo."
  }
  if (normalized.includes("authentication credentials were not provided")) {
    return "Tu sesión expiró. Inicia sesión nuevamente."
  }
  if (normalized.includes("field may not be blank")) {
    return "Completa este campo para continuar."
  }
  if (normalized.includes("this field is required")) {
    return "Este campo es obligatorio."
  }

  return toCleanSentence(message)
}

function fromApiDiagnosticPayload(data: Record<string, unknown>) {
  const detail = typeof data.detail === "string" ? data.detail.trim() : ""
  const errorId = typeof data.error_id === "string" ? data.error_id.trim() : ""
  const hint = typeof data.hint === "string" ? data.hint.trim() : ""
  const debugMessage = typeof data.debug_message === "string" ? data.debug_message.trim() : ""

  if (!detail && !errorId && !hint && !debugMessage) {
    return null
  }

  if (hint === "database_unreachable_or_misconfigured") {
    return `No se pudo conectar a la base de datos${errorId ? ` (ref: ${errorId})` : ""}.`
  }

  if (hint === "database_schema_or_migration_issue") {
    return `La base de datos no está sincronizada con el backend${errorId ? ` (ref: ${errorId})` : ""}.`
  }

  if (detail) {
    return `${mapKnownMessage(detail)}${errorId ? ` (ref: ${errorId})` : ""}${debugMessage ? ` • ${debugMessage}` : ""}`
  }

  return `Error interno del servidor${errorId ? ` (ref: ${errorId})` : ""}.`
}

function fromObjectData(data: Record<string, unknown>) {
  if (typeof data.detail === "string" && data.detail.trim()) {
    return mapKnownMessage(data.detail)
  }

  if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
    const first = data.non_field_errors.find((value) => typeof value === "string")
    if (typeof first === "string") {
      return mapKnownMessage(first)
    }
  }

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string" && value.trim()) {
      const label = fieldLabels[key]
      return label ? `Revisa ${label}: ${mapKnownMessage(value).toLowerCase()}` : mapKnownMessage(value)
    }

    if (Array.isArray(value) && value.length > 0) {
      const first = value.find((item) => typeof item === "string" && item.trim())
      if (typeof first === "string") {
        const label = fieldLabels[key]
        return label ? `Revisa ${label}: ${mapKnownMessage(first).toLowerCase()}` : mapKnownMessage(first)
      }
    }
  }

  return null
}

export function buildHumanApiErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  if (!error.response) {
    return "No pudimos conectar con el servidor. Intenta nuevamente."
  }

  const { status, data } = error.response

  if (status === 429) {
    return "Hiciste demasiados intentos en poco tiempo. Espera un momento e inténtalo de nuevo."
  }

  if (typeof data === "string" && data.trim()) {
    const normalized = data.trim().toLowerCase()
    if (normalized.includes("<html") && normalized.includes("server error")) {
      return "El backend devolvió un error interno (500). Revisa la referencia en logs del servidor."
    }
    return mapKnownMessage(data)
  }

  if (data && typeof data === "object") {
    const diagnostics = fromApiDiagnosticPayload(data as Record<string, unknown>)
    if (diagnostics) {
      return diagnostics
    }

    const parsed = fromObjectData(data as Record<string, unknown>)
    if (parsed) {
      return parsed
    }
  }

  if (status >= 500) {
    return "Tuvimos un problema interno. Intenta nuevamente en unos minutos."
  }

  return fallback
}
