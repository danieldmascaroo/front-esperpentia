import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from "axios"

declare module "axios" {
  export interface AxiosRequestConfig {
    _retry?: boolean
    skipAuthRefresh?: boolean
    requiresCsrf?: boolean
  }

  export interface InternalAxiosRequestConfig {
    _retry?: boolean
    skipAuthRefresh?: boolean
    requiresCsrf?: boolean
  }
}

function resolveApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_BASE_URL ?? "").trim()
  if (!raw) {
    throw new Error("Missing required env var: VITE_API_BASE_URL")
  }
  return raw
}

const API_BASE_URL = resolveApiBaseUrl()
const CSRF_COOKIE_NAME = "csrftoken"
const CSRF_HEADER_NAME = "X-CSRFToken"
const CSRF_ENDPOINT = "/auth/csrf/"

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
  skipAuthRefresh?: boolean
  requiresCsrf?: boolean
}

let accessToken: string | null = null
let refreshPromise: Promise<string | null> | null = null
let csrfPromise: Promise<string | null> | null = null
let csrfToken: string | null = null
let onAuthFailure: (() => void) | null = null
let authSessionVersion = 0
const REFRESH_RETRY_DELAYS_MS = [400, 1200, 2500]

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: CSRF_COOKIE_NAME,
  xsrfHeaderName: CSRF_HEADER_NAME,
  headers: {
    "Content-Type": "application/json",
  },
})

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null
  }

  const cookies = document.cookie ? document.cookie.split("; ") : []
  for (const cookie of cookies) {
    const [key, ...value] = cookie.split("=")
    if (key === name) {
      return decodeURIComponent(value.join("="))
    }
  }

  return null
}

function isUnsafeMethod(method?: string) {
  const normalizedMethod = method?.toUpperCase()
  return normalizedMethod === "POST" || normalizedMethod === "PUT" || normalizedMethod === "PATCH" || normalizedMethod === "DELETE"
}

async function ensureCsrfToken() {
  const existingToken = readCookie(CSRF_COOKIE_NAME) ?? csrfToken
  if (existingToken) {
    csrfToken = existingToken
    return existingToken
  }

  if (csrfPromise) {
    return csrfPromise
  }

  const currentPromise = api
    .get(CSRF_ENDPOINT, { skipAuthRefresh: true })
    .then((response) => {
      const responseToken =
        typeof response.data === "object" &&
        response.data &&
        "csrfToken" in response.data &&
        typeof response.data.csrfToken === "string"
          ? response.data.csrfToken
          : null

      const nextToken = readCookie(CSRF_COOKIE_NAME) ?? responseToken
      csrfToken = nextToken
      return nextToken
    })
    .catch(() => null)
    .finally(() => {
      if (csrfPromise === currentPromise) {
        csrfPromise = null
      }
    })

  csrfPromise = currentPromise
  return currentPromise
}

function setAuthorizationHeader(config: RetryableRequestConfig, token: string) {
  const headers = AxiosHeaders.from(config.headers)
  headers.set("Authorization", `Bearer ${token}`)
  config.headers = headers
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function shouldRetryRefresh(status?: number) {
  return status === undefined || status >= 500 || status === 429
}

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise
  }

  const sessionVersionAtStart = authSessionVersion
  const currentRefreshPromise = api
    .post<{ access: string }>("/auth/jwt/refresh/", undefined, {
      skipAuthRefresh: true,
      requiresCsrf: true,
    } as RetryableRequestConfig)
    .then(({ data }) => {
      if (sessionVersionAtStart !== authSessionVersion) {
        return null
      }

      setAccessToken(data.access)
      return data.access
    })
    .catch(async (initialError: unknown) => {
      let latestError = initialError

      for (const retryDelay of REFRESH_RETRY_DELAYS_MS) {
        const axiosError = latestError as AxiosError | undefined
        const status = axiosError?.response?.status

        if (!shouldRetryRefresh(status)) {
          break
        }

        await sleep(retryDelay)
        try {
          const { data } = await api.post<{ access: string }>("/auth/jwt/refresh/", undefined, {
            skipAuthRefresh: true,
            requiresCsrf: true,
          } as RetryableRequestConfig)

          if (sessionVersionAtStart !== authSessionVersion) {
            return null
          }

          setAccessToken(data.access)
          return data.access
        } catch (retryError) {
          latestError = retryError
        }
      }

      const finalAxiosError = latestError as AxiosError | undefined
      const finalStatus = finalAxiosError?.response?.status

      // Solo invalidamos sesión cuando el refresh token realmente no es valido.
      if (finalStatus === 401 || finalStatus === 403) {
        clearAccessToken()
        onAuthFailure?.()
        return null
      }

      throw latestError
    })
    .finally(() => {
      if (refreshPromise === currentRefreshPromise) {
        refreshPromise = null
      }
    })

  refreshPromise = currentRefreshPromise
  return refreshPromise
}

api.interceptors.request.use((config) => {
  const requestConfig = config as RetryableRequestConfig

  if (
    accessToken &&
    !requestConfig.skipAuthRefresh &&
    !requestConfig.url?.includes("/auth/jwt/refresh/")
  ) {
    setAuthorizationHeader(requestConfig, accessToken)
  }

  return requestConfig
})

api.interceptors.request.use(async (config) => {
  const requestConfig = config as RetryableRequestConfig

  if (requestConfig.requiresCsrf && isUnsafeMethod(requestConfig.method)) {
    const nextCsrfToken = await ensureCsrfToken()
    if (nextCsrfToken) {
      const headers = AxiosHeaders.from(requestConfig.headers)
      headers.set(CSRF_HEADER_NAME, nextCsrfToken)
      requestConfig.headers = headers
    }
  }

  return requestConfig
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (!originalRequest || status !== 401) {
      return Promise.reject(error)
    }

    if (
      originalRequest.skipAuthRefresh ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/jwt/refresh/")
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    const nextAccessToken = await refreshAccessToken()

    if (!nextAccessToken) {
      return Promise.reject(error)
    }

    setAuthorizationHeader(originalRequest, nextAccessToken)
    return api(originalRequest)
  }
)

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function clearAccessToken() {
  accessToken = null
}

export function invalidateAuthSession() {
  authSessionVersion += 1
  clearAccessToken()
}

export function registerAuthFailureHandler(handler: (() => void) | null) {
  onAuthFailure = handler
}

