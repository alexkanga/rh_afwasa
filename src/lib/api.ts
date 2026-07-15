const API_BASE = ''

interface ApiOptions extends RequestInit {
  params?: Record<string, string>
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { params, ...fetchOpts } = opts

  let url = `${API_BASE}${path}`
  if (params) {
    const qs = new URLSearchParams(params).toString()
    if (qs) url += `?${qs}`
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('rh_token') : null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers as Record<string, string> || {}),
  }

  const res = await fetch(url, { ...fetchOpts, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.error || `Erreur ${res.status}`, res.status)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>) =>
    apiFetch<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),

  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),

  delete: <T>(path: string) =>
    apiFetch<T>(path, { method: 'DELETE' }),
}