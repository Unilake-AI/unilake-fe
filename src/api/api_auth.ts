import axios from 'axios'

import { API } from '@/api/api'
import type { LoginRequest, LoginResponse } from '@/types/auth'

// Các API xác thực dùng axios trần (không qua `http`) để lỗi 401 ở đây không kích hoạt
// cơ chế tự làm mới token / chuyển về trang đăng nhập.

export const API_SignIn = async (values: LoginRequest): Promise<LoginResponse> => {
  const res = await axios.post<LoginResponse>(`${API}/api/v1/auth/login`, values)
  return res.data
}

/** Đổi refresh token lấy access token mới (backend trả cả refresh token mới). */
export const API_RefreshToken = async (refreshToken: string): Promise<LoginResponse> => {
  const res = await axios.post<LoginResponse>(`${API}/api/v1/auth/refresh`, {
    refresh_token: refreshToken,
  })
  return res.data
}

/** Kết thúc phiên ở backend (thu hồi refresh token của phiên hiện tại). */
export const API_Logout = async (refreshToken: string): Promise<void> => {
  await axios.post(`${API}/api/v1/auth/logout`, { refresh_token: refreshToken })
}
