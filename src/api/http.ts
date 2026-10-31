import axios from 'axios'
import Cookies from 'js-cookie'

import { API } from '@/api/api'
import { API_RefreshToken } from '@/api/api_auth'
import { readRefreshToken, redirectToLoginExpired, storeSession } from '@/lib/session'
import type { ApiErrorBody } from '@/types/auth'

import type { InternalAxiosRequestConfig } from 'axios'

/** Client gọi REST API của backend (`/api/v1`), tự gắn Bearer token đã lưu khi đăng nhập. */
export const http = axios.create({ baseURL: `${API}/api/v1`, timeout: 30_000 })

function readAccessToken(): string | undefined {
  const fromCookie = Cookies.get('access_token')
  if (fromCookie) {
    return fromCookie
  }
  try {
    return localStorage.getItem('access_token') ?? undefined
  } catch {
    return undefined
  }
}

http.interceptors.request.use((config) => {
  // Không ghi đè khi request đã có token (vd. gửi lại với token vừa làm mới).
  const token = readAccessToken()
  if (token && !config.headers.has('Authorization')) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

type RetriableConfig = InternalAxiosRequestConfig & { _retriedAfterRefresh?: boolean }

// Nhiều request cùng gặp 401 thì chỉ gọi /auth/refresh một lần, các request còn lại chờ chung.
let refreshing: Promise<string | null> | null = null

/** Làm mới access token bằng refresh token đã lưu; trả null nếu không làm mới được. */
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= (async () => {
    const refreshToken = readRefreshToken()
    if (!refreshToken) {
      return null
    }
    try {
      const data = await API_RefreshToken(refreshToken)
      storeSession(data)
      return data.access_token
    } catch {
      return null
    }
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

// Token hết hạn hoặc bị thu hồi: backend trả 401 cho request đã gửi kèm token.
// Thử làm mới token một lần rồi gửi lại request; không được thì về trang đăng nhập.
http.interceptors.response.use(undefined, async (error: unknown) => {
  if (
    axios.isAxiosError(error) &&
    error.response?.status === 401 &&
    error.config?.headers.has('Authorization')
  ) {
    const config = error.config as RetriableConfig
    if (!config._retriedAfterRefresh) {
      const token = await refreshAccessToken()
      if (token) {
        config._retriedAfterRefresh = true
        config.headers.set('Authorization', `Bearer ${token}`)
        return http.request(config)
      }
    }
    redirectToLoginExpired()
  }
  return Promise.reject(error instanceof Error ? error : new Error(String(error)))
})

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu yêu cầu.',
  429: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
}

const SERVER_ERROR_MESSAGE = 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'

/**
 * Lấy thông báo lỗi dễ đọc. Ưu tiên nội dung backend trả trong envelope lỗi chuẩn;
 * lỗi máy chủ (5xx) luôn dùng câu chung để không lộ chi tiết kỹ thuật.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'Máy chủ phản hồi quá lâu. Vui lòng thử lại sau.'
  }
  if (!error.response) {
    return 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'
  }
  const { status } = error.response
  if (status >= 500) {
    return SERVER_ERROR_MESSAGE
  }
  const body = error.response.data as (ApiErrorBody & { detail?: unknown }) | undefined
  const detail = typeof body?.detail === 'string' ? body.detail : undefined
  // Lỗi kiểm tra dữ liệu mặc định của FastAPI: `{"detail": [{loc, msg}, ...]}`.
  if (status === 422 && Array.isArray(body?.detail)) {
    return 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại các trường được đánh dấu.'
  }
  return body?.error?.message ?? detail ?? body?.message ?? STATUS_MESSAGES[status] ?? fallback
}

/**
 * Có nên tự gửi lại request lỗi không: chỉ khi mất kết nối thoáng qua hoặc lỗi máy chủ (5xx).
 * Lỗi 4xx (sai dữ liệu, thiếu quyền...) gửi lại vẫn lỗi; quá thời gian chờ thì gửi lại chỉ bắt
 * người dùng đợi thêm một lần timeout nữa.
 */
export function shouldRetryRequest(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return false
  }
  const status = error.response?.status
  return status === undefined || status >= 500
}

/** Mã request_id backend gắn vào lỗi, dùng để tra log khi báo sự cố. */
export function getApiRequestId(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) {
    return undefined
  }
  const body = error.response?.data as { error?: { request_id?: unknown } } | undefined
  const fromBody = body?.error?.request_id
  if (typeof fromBody === 'string' && fromBody) {
    return fromBody
  }
  const fromHeader: unknown = error.response?.headers?.['x-request-id']
  return typeof fromHeader === 'string' && fromHeader ? fromHeader : undefined
}

interface FastApiValidationItem {
  loc?: unknown[]
  msg?: unknown
}

/**
 * Danh sách lỗi chi tiết để hiện dưới thông báo chính: `error.details.errors` của envelope
 * chuẩn (vd. cấu hình nguồn dữ liệu sai) hoặc danh sách `detail` của FastAPI (`trường: lỗi`).
 */
export function getApiErrorDetails(error: unknown): string[] {
  if (!axios.isAxiosError(error)) {
    return []
  }
  const body = error.response?.data as
    { error?: { details?: { errors?: unknown } | null }; detail?: unknown } | undefined
  const errors = body?.error?.details?.errors
  if (Array.isArray(errors)) {
    return errors.filter((item): item is string => typeof item === 'string')
  }
  if (Array.isArray(body?.detail)) {
    return (body.detail as FastApiValidationItem[])
      .filter((item) => typeof item?.msg === 'string')
      .map((item) => {
        const field = (item.loc ?? []).filter((part) => part !== 'body').join('.')
        return field ? `${field}: ${String(item.msg)}` : String(item.msg)
      })
  }
  return []
}
