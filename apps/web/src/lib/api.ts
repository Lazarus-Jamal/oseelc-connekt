import type { ApiResponse, PaginatedResponse } from '@care-connekt/shared'

async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur serveur')
  return data
}

export const api = {
  get: <T>(url: string) => fetchApi<T>(url),
  post: <T>(url: string, body: unknown) =>
    fetchApi<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown) =>
    fetchApi<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) =>
    fetchApi<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string) => fetchApi<T>(url, { method: 'DELETE' }),
}

export async function fetchPaginated<T>(
  url: string,
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResponse<T>> {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) searchParams.set(k, String(v))
    })
  }
  const fullUrl = params ? `${url}?${searchParams.toString()}` : url
  const res = await fetch(fullUrl)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur serveur')
  return data
}
