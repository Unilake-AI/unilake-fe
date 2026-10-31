const DEFAULT_API_URL = 'http://localhost:8000'

/**
 * Chuẩn hoá địa chỉ backend về dạng gốc (không có `/api/v1` và dấu `/` ở cuối).
 * docker-compose đặt `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`, còn các hàm gọi API
 * tự nối thêm `/api/v1`, nên phải bỏ phần này để tránh gọi `/api/v1/api/v1/...`.
 */
export function normalizeApiUrl(value: string | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    return DEFAULT_API_URL
  }
  return trimmed.replace(/\/+$/, '').replace(/\/api\/v1$/, '')
}

export const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL)
export const API = API_URL
