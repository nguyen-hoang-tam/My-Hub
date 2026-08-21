import { clearAuth, getStoredToken } from '../auth'

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) ?? {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { ...init, headers })
  if (!res.ok) {
    // Hết phiên / bị khóa -> đăng xuất ngay (trừ các API đăng nhập)
    if (res.status === 401 && !url.startsWith('/api/auth/')) {
      clearAuth()
      window.location.reload()
      throw new Error('Phiên đăng nhập đã hết hạn')
    }
    const data = await res.json().catch(() => null)
    throw new Error(data?.error ?? `Yêu cầu thất bại (${res.status})`)
  }
  return res.json() as Promise<T>
}
