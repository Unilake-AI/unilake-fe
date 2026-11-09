import { http } from '@/api/http'
import type { LoginRequest, LoginResponse } from '@/types/auth'

// Dùng chung http với API nghiệp vụ; interceptor bỏ qua token/refresh cho các endpoint xác thực.

export const API_SignIn = async (values: LoginRequest): Promise<LoginResponse> => {
  const res = await http.post<LoginResponse>('/auth/login', values)
  return res.data
}

/** Đổi refresh token lấy access token mới (backend trả cả refresh token mới). */
export const API_RefreshToken = async (refreshToken: string): Promise<LoginResponse> => {
  const res = await http.post<LoginResponse>('/auth/refresh', {
    refresh_token: refreshToken,
  })
  return res.data
}

/** Kết thúc phiên ở backend (thu hồi refresh token của phiên hiện tại). */
export const API_Logout = async (refreshToken: string): Promise<void> => {
  await http.post('/auth/logout', { refresh_token: refreshToken })
}
