import { http } from '@/api/http'
import type { LoginRequest, LoginResponse, LoginSession } from '@/types/auth'

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

export async function API_ListSessions(): Promise<LoginSession[]> {
  const res = await http.get<LoginSession[]>('/auth/sessions')
  return res.data
}

export async function API_RevokeSession(sessionId: number): Promise<void> {
  await http.post(`/auth/revoke-session/${sessionId}`)
}
