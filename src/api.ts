export type Product = {
  id: string
  name: string
  price: number
  description: string
  quantity: number
  createdAt: number
  updatedAt: number
}

export type ProductInput = {
  name: string
  price: number
  description: string
  quantity: number
}

const BASE = '/api/products'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error ?? `Yêu cầu thất bại (${res.status})`)
  }
  return res.json() as Promise<T>
}

export const api = {
  listProducts: (signal?: AbortSignal): Promise<Product[]> =>
    request<Product[]>(BASE, { signal }),

  getProduct: (id: string): Promise<Product> => request<Product>(`${BASE}/${id}`),

  createProduct: (input: ProductInput): Promise<Product> =>
    request<Product>(BASE, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateProduct: (id: string, input: ProductInput): Promise<Product> =>
    request<Product>(`${BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteProduct: (id: string): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(`${BASE}/${id}`, { method: 'DELETE' }),

  deleteAll: (): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(BASE, { method: 'DELETE' }),
}