export type UserRole = 'admin' | 'user'

export interface User {
  name: string
  email: string
  role: UserRole
  avatar: string
}

export function roleLabel(role: UserRole | undefined): string {
  return role === 'admin' ? 'Quản trị viên' : 'Thành viên'
}

const USER_KEY = 'myhub.user'
const TOKEN_KEY = 'myhub.token'

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    const token = localStorage.getItem(TOKEN_KEY)
    // Phiên cũ (trước khi có API auth) không có token -> buộc đăng nhập lại
    if (!raw || !token) return null
    const user = JSON.parse(raw) as User
    if ((user.role !== 'admin' && user.role !== 'user') || !user.email) return null
    return user
  } catch {
    return null
  }
}

export function storeUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuth() {
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(TOKEN_KEY)
}
