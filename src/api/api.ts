const DEFAULT_API_URL = 'http://localhost:8000'

/** Một nguồn cấu hình cho trình duyệt và route handler Next.js. Không tự nâng cấp TLS. */
export function normalizeApiUrl(
  value: string | undefined,
  environment = process.env.NODE_ENV
): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    return DEFAULT_API_URL
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error('NEXT_PUBLIC_API_URL phải là URL tuyệt đối hợp lệ.')
  }

  const localDevelopment =
    (environment === 'development' || environment === 'test') &&
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1'].includes(url.hostname)
  if (url.protocol !== 'https:' && !localDevelopment) {
    throw new Error(
      'NEXT_PUBLIC_API_URL phải dùng HTTPS; HTTP chỉ dành cho localhost khi phát triển.'
    )
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('NEXT_PUBLIC_API_URL không được chứa thông tin đăng nhập, query hoặc fragment.')
  }

  return url
    .toString()
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/, '')
}

export const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL)
export const API = API_URL
export const API_BASE_URL = `${API_URL}/api/v1`
export const API_TIMEOUT = 30_000
