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
      // Import khi cần để tránh phụ thuộc vòng: mô-đun xác thực cũng dùng instance http này.
      const { API_RefreshToken } = await import('@/api/shared/auth')
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
  409: 'Thao tác xung đột với trạng thái hiện tại của dữ liệu. Vui lòng tải lại và kiểm tra.',
  413: 'Tệp vượt quá dung lượng tối đa cho phép.',
  415: 'Định dạng tệp không được hỗ trợ. Chỉ chấp nhận CSV, XLSX hoặc XLSM.',
  422: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
  429: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
}

const API_ERROR_MESSAGES = new Map([
  ['USER_INACTIVE', 'Tài khoản của bạn đang bị khóa. Vui lòng liên hệ quản trị viên.'],
  ['ROLE_REQUIRED', 'Tài khoản chưa được cấp quyền phù hợp. Vui lòng liên hệ quản trị viên.'],
  ['FORBIDDEN', 'Bạn không có quyền truy cập chức năng hoặc phạm vi dữ liệu này.'],
  [
    'STAFF_CONTEXT_UNAVAILABLE',
    'Không thể đọc thông tin quyền và phòng ban của tài khoản. Vui lòng thử lại sau.',
  ],
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
  [
    'UPLOAD_DESTINATION_INVALID',
    'Vui lòng chọn bộ dữ liệu đã có hoặc nhập tên bộ dữ liệu mới, không gửi cả hai.',
  ],
  ['UPLOAD_DOMAIN_REQUIRED', 'Vui lòng chọn lĩnh vực hợp lệ cho bộ dữ liệu mới.'],
  ['UPLOAD_DOMAIN_FORBIDDEN', 'Bạn chỉ được tạo bộ dữ liệu trong lĩnh vực được cấp quyền.'],
  [
    'UPLOAD_DATASET_NAME_CONFLICT',
    'Tên bộ dữ liệu đã tồn tại trong lĩnh vực này. Hãy chọn bộ dữ liệu có sẵn để nạp tiếp hoặc đặt tên khác.',
  ],
  ['UPLOAD_PARSER_INVALID', 'Cấu hình đọc tệp không hợp lệ. Vui lòng kiểm tra lại.'],
  [
    'UPLOAD_FILENAME_INVALID',
    'Tên tệp chỉ được chứa chữ cái không dấu, số, dấu gạch ngang, gạch dưới và dấu chấm.',
  ],
  [
    'UPLOAD_FILE_TYPE_UNSUPPORTED',
    'Định dạng tệp không được hỗ trợ. Chỉ chấp nhận .csv, .xlsx hoặc .xlsm.',
  ],
  ['UPLOAD_TOO_LARGE', 'Tệp vượt quá dung lượng tối đa cho phép.'],
  ['UPLOAD_EMPTY', 'Tệp không có nội dung.'],
  ['UPLOAD_STORAGE_UNAVAILABLE', 'Kho lưu trữ tạm thời đang gián đoạn. Vui lòng thử lại sau.'],
  ['INGESTION_QUEUE_UNAVAILABLE', 'Hàng đợi nạp dữ liệu đang tạm gián đoạn. Vui lòng thử lại sau.'],
  ['QUALITY_ISSUE_NOT_FOUND', 'Không tìm thấy yêu cầu xử lý dữ liệu lỗi trong phạm vi của bạn.'],
  [
    'QUALITY_ISSUE_STATE_CONFLICT',
    'Trạng thái yêu cầu hiện tại không cho phép thực hiện thao tác này.',
  ],
  [
    'QUALITY_ISSUE_MULTIPLE_FILES',
    'Yêu cầu chưa xác định duy nhất một loại dữ liệu và tệp nguồn cần sửa.',
  ],
  [
    'QUALITY_ISSUE_METADATA_UNAVAILABLE',
    'Không thể truy cập dữ liệu yêu cầu xử lý. Vui lòng thử lại sau.',
  ],
  [
    'RESOLUTION_FILE_MISMATCH',
    'Tên tệp tải lên không khớp với tệp nguồn của yêu cầu. Vui lòng giữ nguyên tên tệp gốc.',
  ],
  [
    'RESOLUTION_PARSER_REQUIRED',
    'Bản nguồn chưa lưu cấu hình đọc tệp. Vui lòng mở tùy chọn đọc tệp và nhập cấu hình phù hợp trước khi tải lại.',
  ],
  [
    'RESOLUTION_HEADER_REQUIRED',
    'Nguồn dữ liệu cũ không có dòng tiêu đề; cần quản trị dữ liệu thống nhất cấu hình trước khi tải bản sửa.',
  ],
  [
    'INVALID_RESOLUTION_JOB',
    'Lần nạp này chưa đủ điều kiện làm bằng chứng sửa lỗi (cần lần nạp mới thành công vào Bronze, đúng bộ dữ liệu và tệp nguồn).',
  ],
  [
    'INVALID_RESOLUTION_OWNER',
    'Tệp sửa lỗi phải do chính người phụ trách tải lên cho yêu cầu này.',
  ],
  [
    'WORKER_LEASE_EXPIRED',
    'Quá thời gian xử lý của worker. Hệ thống sẽ xử lý lại hoặc bạn có thể kiểm tra ở lịch sử lần chạy.',
  ],
  ['DATASET_CONFLICT', 'Mã bộ dữ liệu đã tồn tại hoặc thông tin không hợp lệ.'],
  ['DATASET_SOURCE_INVALID', 'Hệ thống nguồn hoặc tầng Bronze chưa sẵn sàng.'],
  ['DATASET_NOT_FOUND', 'Không tìm thấy bộ dữ liệu Bronze.'],
  ['INGESTION_RETRY_STATUS_INVALID', 'Chỉ có thể chạy lại lần nạp đã thất bại (FAILED).'],
  [
    'INGESTION_RETRY_SOURCE_NOT_PINNED',
    'Chỉ hỗ trợ chạy lại thủ công cho các lần nạp tệp tải lên (UPLOAD_V1) đã ghim phiên bản.',
  ],
  ['INGESTION_RETRY_ROOT_NOT_FOUND', 'Không tìm thấy chuỗi lần nạp gốc để chạy lại.'],
  ['INGESTION_RETRY_ALREADY_ACTIVE', 'Chuỗi lần nạp này đang có tác vụ chờ hoặc đang chạy.'],
  ['INGESTION_RETRY_UNAVAILABLE', 'Không thể tạo lần chạy lại vào lúc này. Vui lòng thử lại sau.'],
  ['SILVER_SOURCE_PROFILE_NOT_FOUND', 'Không tìm thấy cấu hình nguồn Silver (Profile).'],
  [
    'SILVER_PROFILE_REVISION_CONFLICT',
    'Cấu hình Silver đã được thay đổi bởi thao tác khác. Vui lòng tải lại trước khi lưu.',
  ],
  ['SILVER_PROFILE_CONFLICT', 'Mã cấu hình Silver (profile_id) đã tồn tại.'],
  [
    'SILVER_ENTITY_NOT_FOUND',
    'Không tìm thấy bảng dữ liệu (entity) này trong phiên bản Silver đã chọn.',
  ],
  ['SILVER_SNAPSHOT_INVALID', 'Phiên bản Silver không đạt kiểm tra hợp lệ trước khi kích hoạt.'],
  [
    'ACTIVE_SNAPSHOT_CHANGED',
    'Phiên bản Silver hiện hành vừa thay đổi. Vui lòng tải lại danh sách trước khi kích hoạt.',
  ],
  [
    'PIPELINE_METADATA_UNAVAILABLE',
    'Không thể truy cập metadata của pipeline. Vui lòng thử lại sau.',
  ],
  [
    'PIPELINE_OBJECT_STORAGE_UNAVAILABLE',
    'Không thể đọc dữ liệu Bronze hoặc ghi dữ liệu Silver trên kho lưu trữ.',
  ],
  ['INVALID_CLEANING_RUN_RANGE', 'Khoảng thời gian lọc lịch sử làm sạch chưa hợp lệ.'],
  ['CLEANING_RUN_NOT_FOUND', 'Không tìm thấy lượt chạy làm sạch này.'],
  ['CLEANING_REPORT_NOT_FOUND', 'Lượt chạy làm sạch này chưa có báo cáo chi tiết.'],
  ['CLEANING_REPORT_UNAVAILABLE', 'Không thể đọc báo cáo chi tiết từ kho lưu trữ.'],
  [
    'QUARANTINE_METADATA_UNAVAILABLE',
    'Không thể truy cập danh sách hồ sơ cách ly. Vui lòng thử lại sau.',
  ],
  ['QUARANTINE_RECORD_NOT_FOUND', 'Không tìm thấy hồ sơ cách ly này.'],
  ['QUARANTINE_SOURCE_FORBIDDEN', 'Bộ dữ liệu này không cho phép xem dòng dữ liệu nguồn gốc.'],
  ['QUARANTINE_SOURCE_UNAVAILABLE', 'Không thể đọc dòng dữ liệu gốc từ kho Bronze.'],
  ['DUPLICATE_QUARANTINE_RECORD', 'Danh sách hồ sơ được chọn có bản ghi bị trùng lặp.'],
  ['INVALID_ISSUE_DEPARTMENT', 'Phòng ban được chọn không tồn tại hoặc đã ngừng hoạt động.'],
  [
    'QUALITY_ISSUE_DATASET_MISMATCH',
    'Các hồ sơ lỗi được gộp phải thuộc cùng bộ dữ liệu, loại dữ liệu (entity) và tệp nguồn.',
  ],
  ['QUALITY_ISSUE_DEPARTMENT_MISMATCH', 'Phòng ban được chọn không khớp với bộ dữ liệu.'],
  [
    'INVALID_ISSUE_ASSIGNEE',
    'Người phụ trách phải có quyền nghiệp vụ phù hợp và đang công tác tại phòng ban được giao.',
  ],
  [
    'INVALID_VERIFICATION_RUN',
    'Lượt chạy Cleaning chưa kết thúc hoặc không khớp với job sửa và entity của yêu cầu.',
  ],
  [
    'VERIFICATION_RUN_NOT_PUBLISHED',
    'Lượt chạy Cleaning chưa xuất bản được phiên bản Silver hợp lệ.',
  ],
  [
    'VERIFICATION_RECORDS_INCOMPLETE',
    'Cần xác nhận đầy đủ toàn bộ các hồ sơ liên quan đến yêu cầu.',
  ],
  [
    'VERIFICATION_RECORDS_UNEXPECTED',
    'Không gửi danh sách hồ sơ đã xác nhận khi từ chối xác minh.',
  ],
  ['CATALOG_CONFLICT', 'Bộ dữ liệu đã tồn tại trong Data Catalog.'],
  ['CATALOG_NOT_FOUND', 'Không tìm thấy mục dữ liệu này trong Data Catalog.'],
])

export function getApiErrorCode(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) {
    return undefined
  }
  const body = error.response?.data as { error?: { code?: unknown } } | undefined
  return typeof body?.error?.code === 'string' ? body.error.code : undefined
}

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
