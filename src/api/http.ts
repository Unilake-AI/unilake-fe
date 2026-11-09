import axios from 'axios'
import Cookies from 'js-cookie'

import { API_BASE_URL, API_TIMEOUT } from '@/api/api'
import { readRefreshToken, redirectToLoginExpired, storeSession } from '@/lib/session'

import type { InternalAxiosRequestConfig } from 'axios'

/** Client gọi REST API của backend (`/api/v1`), tự gắn Bearer token đã lưu khi đăng nhập. */
export const http = axios.create({ baseURL: API_BASE_URL, timeout: API_TIMEOUT })

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

// Các endpoint này xác thực bằng payload, không dùng access token của phiên hiện tại.
const SESSION_ENDPOINTS = new Set(['/auth/login', '/auth/refresh', '/auth/logout'])

http.interceptors.request.use((config: RetriableConfig) => {
  if (SESSION_ENDPOINTS.has(config.url ?? '')) {
    config._sessionAuthorization = false
    return config
  }
  // Không ghi đè khi request đã có token (vd. gửi lại với token vừa làm mới).
  const token = readAccessToken()
  if (token && !config.headers.has('Authorization')) {
    config.headers.set('Authorization', `Bearer ${token}`)
    config._sessionAuthorization = true
  }
  return config
})

type RetriableConfig = InternalAxiosRequestConfig & {
  _retriedAfterRefresh?: boolean
  _sessionAuthorization?: boolean
}

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
      // Import khi cần để tránh phụ thuộc vòng: api_auth cũng dùng instance http này.
      const { API_RefreshToken } = await import('@/api/api_auth')
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
    (error.config as RetriableConfig | undefined)?._sessionAuthorization
  ) {
    const config = error.config as RetriableConfig
    if (!config._retriedAfterRefresh) {
      // Một 401 đến muộn sau khi request khác đã refresh: dùng token mới đã lưu.
      const currentToken = readAccessToken()
      const token =
        currentToken && config.headers.get('Authorization') !== `Bearer ${currentToken}`
          ? currentToken
          : await refreshAccessToken()
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
  422: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
  429: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
}

const API_ERROR_MESSAGES = new Map([
  ['USER_INACTIVE', 'Tài khoản của bạn đang bị khóa. Vui lòng liên hệ quản trị viên.'],
  ['ROLE_REQUIRED', 'Tài khoản chưa được cấp quyền phù hợp. Vui lòng liên hệ quản trị viên.'],
  ['SESSION_NOT_FOUND', 'Phiên đăng nhập này đã kết thúc hoặc không còn hoạt động.'],
  ['SOURCE_NAME_EXIST', 'Tên nguồn dữ liệu đã được sử dụng. Vui lòng chọn tên khác.'],
  ['SOURCE_SYSTEM_NOT_FOUND', 'Không tìm thấy hệ thống nguồn. Vui lòng chọn lại.'],
  ['CONFIGURATION_INVALID', 'Thông tin kết nối chưa hợp lệ. Vui lòng kiểm tra lại.'],
  ['DATA_SOURCE_NOT_FOUND', 'Không tìm thấy nguồn dữ liệu này.'],
  ['INGESTION_JOB_NOT_FOUND', 'Không tìm thấy lần nạp dữ liệu này.'],
  ['INGESTION_NOT_FOUND', 'Không tìm thấy nguồn hoặc bộ dữ liệu đích. Vui lòng kiểm tra lại.'],
  ['SOURCE_ALREADY_RUNNING', 'Nguồn này đang được nạp. Hãy đợi lần nạp hiện tại hoàn tất.'],
  ['SOURCE_INACTIVE', 'Nguồn đang tắt. Hãy bật nguồn trước khi nạp dữ liệu.'],
  ['BRONZE_DATASET_REQUIRED', 'Vui lòng chọn một bộ dữ liệu thô làm nơi lưu.'],
  [
    'DATASET_SOURCE_MISMATCH_OR_INACTIVE',
    'Hãy chọn bộ dữ liệu đang hoạt động và thuộc cùng hệ thống nguồn.',
  ],
  [
    'SOURCE_CONFIGURATION_INVALID_OR_UNSUPPORTED',
    'Không thể sử dụng nguồn này. Vui lòng kiểm tra thông tin kết nối.',
  ],
  ['INVALID_SOURCE_TABLE', 'Tên tệp hoặc bảng nguồn chưa hợp lệ. Vui lòng kiểm tra lại.'],
  [
    'BRONZE_INPUT_VALIDATION_BLOCKED',
    'Dữ liệu nguồn chưa đạt yêu cầu. Hãy kiểm tra nội dung trước khi nạp lại.',
  ],
  ['INGESTION_READING_FAILED', 'Không đọc được dữ liệu. Vui lòng kiểm tra nguồn và thử lại.'],
  ['INGESTION_WRITING_FAILED', 'Không lưu được dữ liệu. Vui lòng thử lại sau.'],
  ['SUCCESSFUL_BRONZE_JOB_REQUIRED', 'Chỉ có thể làm sạch sau khi dữ liệu đã được nạp thành công.'],
  ['DEDICATED_DEMO_CATALOG_REQUIRED', 'Bộ dữ liệu này chưa được hỗ trợ làm sạch.'],
  ['UNSUPPORTED_BRONZE_FILE_TYPE', 'Loại tệp này chưa được hỗ trợ làm sạch.'],
  ['INVALID_SQL', 'Chưa thể trả lời câu hỏi này. Bạn có thể thử hỏi theo cách khác.'],
])

export function getErrorMessageForCode(code: unknown): string | undefined {
  return typeof code === 'string' ? API_ERROR_MESSAGES.get(code) : undefined
}

/** Chỉ dùng câu đã soạn cho giao diện, kể cả khi máy chủ trả thêm chi tiết. */
export function getApiErrorMessage(
  error: unknown,
  fallback: string,
  unauthorizedMessage = STATUS_MESSAGES[401]
): string {
  if (!axios.isAxiosError(error)) {
    return fallback
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại sau.'
  }
  if (!error.response) {
    return 'Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.'
  }
  const { status } = error.response
  if (status >= 500) {
    return 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.'
  }
  if (status === 401 && unauthorizedMessage) return unauthorizedMessage
  const body = error.response.data as { error?: { code?: unknown } } | undefined
  return getErrorMessageForCode(body?.error?.code) ?? STATUS_MESSAGES[status] ?? fallback
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
