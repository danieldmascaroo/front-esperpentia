import axios from "axios"

import { api } from "@/api/client"
import { buildHumanApiErrorMessage } from "@/lib/human-errors"
import type { AuthCredentials, AuthProfileUpdatePayload, AuthUser } from "@/pages/types"

export class AuthApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "AuthApiError"
    this.status = status
  }
}

function toAuthApiError(error: unknown, fallbackMessage: string) {
  const message = buildHumanApiErrorMessage(error, fallbackMessage)
  const status = axios.isAxiosError(error) ? error.response?.status : undefined
  return new AuthApiError(message, status)
}

type JwtTokenPair = {
  access: string
}

type AccessTokenResponse = {
  access: string
}

export async function loginRequest(credentials: AuthCredentials) {
  try {
    const { data } = await api.post<JwtTokenPair>(
      "/auth/jwt/create/",
      credentials,
      { skipAuthRefresh: true, requiresCsrf: true }
    )
    return data
  } catch (error) {
    throw toAuthApiError(error, "No se pudo iniciar sesión")
  }
}

export async function refreshAccessTokenRequest() {
  try {
    const { data } = await api.post<AccessTokenResponse>("/auth/jwt/refresh/", undefined, {
      skipAuthRefresh: true,
      requiresCsrf: true,
    })
    return data
  } catch (error) {
    throw toAuthApiError(error, "No se pudo restaurar la sesión")
  }
}

export async function logoutRequest() {
  try {
    await api.post("/auth/jwt/logout/", undefined, { skipAuthRefresh: true, requiresCsrf: true })
  } catch (error) {
    throw toAuthApiError(error, "No se pudo cerrar sesión")
  }
}

export async function getCurrentUserRequest() {
  try {
    const { data } = await api.get<AuthUser>("/auth/users/me/")
    return data
  } catch (error) {
    throw toAuthApiError(error, "No se pudo cargar el usuario")
  }
}

export async function updateCurrentUserRequest(payload: AuthProfileUpdatePayload) {
  try {
    const { data } = await api.patch<AuthUser>("/auth/users/me/", payload)
    return data
  } catch (error) {
    throw toAuthApiError(error, "No se pudieron actualizar los datos")
  }
}

export async function requestPasswordReset(email: string) {
  try {
    await api.post("/auth/users/reset_password/", { email }, { skipAuthRefresh: true })
  } catch (error) {
    throw toAuthApiError(error, "No pudimos enviar el correo de recuperación. Intenta nuevamente.")
  }
}

export async function confirmPasswordReset(payload: {
  uid: string
  token: string
  new_password: string
  re_new_password: string
}) {
  try {
    await api.post("/auth/users/reset_password_confirm/", payload, { skipAuthRefresh: true })
  } catch (error) {
    throw toAuthApiError(error, "No pudimos actualizar tu contraseña. Solicita un nuevo enlace.")
  }
}
