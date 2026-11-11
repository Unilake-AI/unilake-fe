import { http } from '@/api/http'
import type { AuthMeResponse, AuthUser, LoginRequest, LoginResponse } from '@/types/auth'

// Đăng nhập hệ thống
export const API_SignIn = async (values: LoginRequest): Promise<LoginResponse> => {
  const res = await http.post<LoginResponse>('/auth/login', values)
  return res.data
}

// Làm mới access token khi hết hạn
export const API_RefreshToken = async (refreshToken: string): Promise<LoginResponse> => {
  const res = await http.post<LoginResponse>('/auth/refresh', {
    refresh_token: refreshToken,
  })
  return res.data
}

// Đăng xuất tài khoản
export const API_Logout = async (refreshToken: string): Promise<void> => {
  await http.post('/auth/logout', { refresh_token: refreshToken })
}

export async function API_GetCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/me')
  if (!res.ok) {
    return null
  }
  const data = (await res.json()) as AuthMeResponse
  return data.user
}

export async function API_ClearAuthCookies(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' })
}
