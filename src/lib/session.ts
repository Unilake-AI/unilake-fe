import Cookies from 'js-cookie'

/** Tham số trên URL trang đăng nhập khi phiên bị hết hạn (`/login?expired=1`). */
export const SESSION_EXPIRED_PARAM = 'expired'

interface StoredSession {
  access_token: string
  refresh_token?: string | null
  user?: unknown
}

/** Lưu token sau khi đăng nhập hoặc làm mới: cookie cho middleware, localStorage cho client. */
export function storeSession(session: StoredSession): void {
  Cookies.set('access_token', session.access_token, { expires: 1, path: '/', sameSite: 'lax' })
  if (session.refresh_token) {
    Cookies.set('refresh_token', session.refresh_token, { expires: 7, path: '/', sameSite: 'lax' })
  }
  try {
    localStorage.setItem('access_token', session.access_token)
    if (session.refresh_token) {
      localStorage.setItem('refresh_token', session.refresh_token)
    }
    if (session.user) {
      localStorage.setItem('user', JSON.stringify(session.user))
    }
  } catch {
    // Trình duyệt chặn lưu trữ: cookie vẫn đủ cho middleware.
  }
}

export function readRefreshToken(): string | undefined {
  const fromCookie = Cookies.get('refresh_token')
  if (fromCookie) {
    return fromCookie
  }
  try {
    return localStorage.getItem('refresh_token') ?? undefined
  } catch {
    return undefined
  }
}

/** Xoá token và thông tin người dùng đã lưu khi đăng nhập. */
export function clearStoredSession(): void {
  Cookies.remove('access_token', { path: '/' })
  Cookies.remove('refresh_token', { path: '/' })
  try {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  } catch {
    // Trình duyệt chặn lưu trữ: không có gì để xoá.
  }
}

/** Phiên hết hạn: xoá dữ liệu phiên rồi đưa người dùng về trang đăng nhập kèm thông báo. */
export function redirectToLoginExpired(): void {
  clearStoredSession()
  if (typeof window === 'undefined' || window.location.pathname === '/login') {
    return
  }
  window.location.assign(`/login?${SESSION_EXPIRED_PARAM}=1`)
}
