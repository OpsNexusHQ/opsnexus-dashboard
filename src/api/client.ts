const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8080'

export class ApiClientError extends Error {
  readonly status: number
  readonly body: string

  constructor(status: number, body: string, message: string) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.body = body
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`
  const method = options?.method?.toString().toUpperCase() || 'GET'
  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
  }

  if (method !== 'GET' && method !== 'HEAD') {
    defaultHeaders['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options?.headers as Record<string, string> | undefined),
    },
  })

  if (!response.ok) {
    let body = ''
    try { body = await response.text() } catch { /* ignore */ }
    throw new ApiClientError(response.status, body, `HTTP ${response.status} from ${path}`)
  }

  if (response.status === 204 || response.headers.get('Content-Length') === '0') {
    return undefined as T
  }

  return response.json() as Promise<T>
}

/** Returns true if the backend is reachable. */
export async function ping(options?: RequestInit): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, {
      ...options,
      signal: options?.signal ?? AbortSignal.timeout(3000),
    })
    return res.ok
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    return false
  }
}
