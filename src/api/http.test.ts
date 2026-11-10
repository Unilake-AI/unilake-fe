import { AxiosError, AxiosHeaders } from 'axios'
import Cookies from 'js-cookie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { API_RefreshToken } from '@/api/shared/auth'
import { readRefreshToken, redirectToLoginExpired, storeSession } from '@/lib/session'

import { getApiErrorMessage, http, shouldRetryRequest } from './http'

import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'

vi.mock('@/lib/session', () => ({
  redirectToLoginExpired: vi.fn(),
  readRefreshToken: vi.fn(),
  storeSession: vi.fn(),
}))
vi.mock('@/api/shared/auth', () => ({ API_RefreshToken: vi.fn() }))

function errorWith(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  return new AxiosError('fail', 'ERR_BAD_RESPONSE', config, undefined, {
    status,
    statusText: '',
    headers: new AxiosHeaders(),
    config,
    data,
  })
}

describe('getApiErrorMessage', () => {
  it('dùng câu đã soạn theo loại lỗi và bỏ nội dung thô', () => {
    const error = errorWith(409, {
      error: { code: 'SOURCE_NAME_EXIST', message: 'unique key violation' },
    })
    expect(getApiErrorMessage(error, 'mặc định')).toBe(
      'Tên nguồn dữ liệu đã được sử dụng. Vui lòng chọn tên khác.'
    )
    expect(getApiErrorMessage(errorWith(400, { detail: 'SQLSTATE 22000' }), 'mặc định')).toBe(
      'mặc định'
    )
  })

  it('dùng câu theo mã lỗi khi backend không gửi nội dung', () => {
    expect(getApiErrorMessage(errorWith(403, {}), 'x')).toBe(
      'Bạn không có quyền thực hiện thao tác này.'
    )
    expect(getApiErrorMessage(errorWith(404, {}), 'x')).toBe('Không tìm thấy dữ liệu yêu cầu.')
    expect(getApiErrorMessage(errorWith(401, {}), 'x')).toMatch(/hết hạn/)
    expect(getApiErrorMessage(errorWith(418, {}), 'mặc định')).toBe('mặc định')
  })

  it('không hiện chi tiết kỹ thuật của lỗi máy chủ', () => {
    const error = errorWith(500, { error: { message: 'Traceback (most recent call last) ...' } })
    expect(getApiErrorMessage(error, 'x')).toBe('Hệ thống đang gặp sự cố. Vui lòng thử lại sau.')
  })

  it('báo mất kết nối và quá thời gian chờ', () => {
    expect(getApiErrorMessage(new AxiosError('net', 'ERR_NETWORK'), 'x')).toMatch(
      /Không thể kết nối/
    )
    expect(getApiErrorMessage(new AxiosError('slow', 'ECONNABORTED'), 'x')).toMatch(
      /quá nhiều thời gian/
    )
    expect(getApiErrorMessage(new Error('khác'), 'mặc định')).toBe('mặc định')
  })
})

describe('lỗi kiểm tra dữ liệu', () => {
  it('báo kiểm tra lại thông tin mà không đưa tên trường hoặc chi tiết nội bộ ra giao diện', () => {
    const validation = errorWith(422, {
      detail: [{ type: 'missing', loc: ['body', 'username'], msg: 'Field required' }],
    })
    expect(getApiErrorMessage(validation, 'x')).toBe(
      'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.'
    )
  })
})

describe('shouldRetryRequest', () => {
  it('chỉ thử lại khi mất kết nối hoặc lỗi máy chủ', () => {
    expect(shouldRetryRequest(new AxiosError('net', 'ERR_NETWORK'))).toBe(true)
    expect(shouldRetryRequest(errorWith(503, {}))).toBe(true)
    expect(shouldRetryRequest(new AxiosError('slow', 'ECONNABORTED'))).toBe(false)
    expect(shouldRetryRequest(errorWith(403, {}))).toBe(false)
    expect(shouldRetryRequest(errorWith(422, {}))).toBe(false)
    expect(shouldRetryRequest(new Error('x'))).toBe(false)
  })
})

describe('http interceptors', () => {
  const originalAdapter = http.defaults.adapter

  function respondWith(status: number): AxiosAdapter {
    return (config) =>
      status < 400
        ? Promise.resolve({ data: {}, status, statusText: '', headers: {}, config })
        : Promise.reject(
            new AxiosError('fail', 'ERR_BAD_REQUEST', config, undefined, {
              data: {},
              status,
              statusText: '',
              headers: new AxiosHeaders(),
              config,
            })
          )
  }

  beforeEach(() => {
    vi.mocked(redirectToLoginExpired).mockReset()
    vi.mocked(readRefreshToken).mockReset()
    vi.mocked(storeSession).mockReset()
    vi.mocked(API_RefreshToken).mockReset()
    Cookies.remove('access_token')
    localStorage.clear()
  })

  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  it('gắn Bearer token đã lưu vào request', async () => {
    Cookies.set('access_token', 'abc')
    let sent: string | undefined
    http.defaults.adapter = (config) => {
      sent = String(config.headers.get('Authorization'))
      return respondWith(200)(config)
    }
    await http.get('/datasources')
    expect(sent).toBe('Bearer abc')
  })

  it('giữ Authorization riêng kể cả khi backend trả 401', async () => {
    Cookies.set('access_token', 'session-token')
    let sent: unknown
    http.defaults.adapter = (config) => {
      sent = config.headers.get('Authorization')
      return respondWith(401)(config)
    }
    await expect(
      http.get('/custom', { headers: { Authorization: 'Bearer custom-token' } })
    ).rejects.toBeInstanceOf(AxiosError)
    expect(sent).toBe('Bearer custom-token')
    expect(API_RefreshToken).not.toHaveBeenCalled()
    expect(redirectToLoginExpired).not.toHaveBeenCalled()
  })

  it('dùng token đã được request khác làm mới khi 401 đến muộn', async () => {
    Cookies.set('access_token', 'expired')
    const seen: string[] = []
    http.defaults.adapter = (config) => {
      const auth = String(config.headers.get('Authorization'))
      seen.push(auth)
      if (auth === 'Bearer expired') {
        Cookies.set('access_token', 'fresh')
        return respondWith(401)(config)
      }
      return respondWith(200)(config)
    }
    await http.get('/late')
    expect(seen).toEqual(['Bearer expired', 'Bearer fresh'])
    expect(API_RefreshToken).not.toHaveBeenCalled()
  })

  it('đưa về trang đăng nhập khi 401 mà không có refresh token', async () => {
    Cookies.set('access_token', 'expired')
    http.defaults.adapter = respondWith(401)
    await expect(http.get('/datasources')).rejects.toBeInstanceOf(AxiosError)
    expect(API_RefreshToken).not.toHaveBeenCalled()
    expect(redirectToLoginExpired).toHaveBeenCalledTimes(1)
  })

  it('làm mới token rồi gửi lại request khi gặp 401', async () => {
    Cookies.set('access_token', 'expired')
    vi.mocked(readRefreshToken).mockReturnValue('refresh-1')
    vi.mocked(API_RefreshToken).mockResolvedValue({
      access_token: 'fresh',
      refresh_token: 'refresh-2',
      token_type: 'bearer',
      user: { user_id: 1, username: 'admin', role: 'ADMIN' },
    })
    const seen: string[] = []
    http.defaults.adapter = (config) => {
      const auth = String(config.headers.get('Authorization'))
      seen.push(auth)
      return respondWith(auth === 'Bearer fresh' ? 200 : 401)(config)
    }

    const res = await http.get('/datasources')

    expect(res.status).toBe(200)
    expect(seen).toEqual(['Bearer expired', 'Bearer fresh'])
    expect(API_RefreshToken).toHaveBeenCalledWith('refresh-1')
    expect(storeSession).toHaveBeenCalledWith(expect.objectContaining({ access_token: 'fresh' }))
    expect(redirectToLoginExpired).not.toHaveBeenCalled()
  })

  it('chỉ gọi refresh một lần cho nhiều request cùng hết hạn', async () => {
    Cookies.set('access_token', 'expired')
    vi.mocked(readRefreshToken).mockReturnValue('refresh-1')
    vi.mocked(API_RefreshToken).mockResolvedValue({
      access_token: 'fresh',
      refresh_token: 'refresh-2',
      token_type: 'bearer',
      user: { user_id: 1, username: 'admin', role: 'ADMIN' },
    })
    http.defaults.adapter = (config) =>
      respondWith(String(config.headers.get('Authorization')) === 'Bearer fresh' ? 200 : 401)(
        config
      )

    await Promise.all([http.get('/a'), http.get('/b'), http.get('/c')])

    expect(API_RefreshToken).toHaveBeenCalledTimes(1)
  })

  it('về trang đăng nhập khi làm mới thất bại hoặc token mới vẫn bị 401', async () => {
    Cookies.set('access_token', 'expired')
    vi.mocked(readRefreshToken).mockReturnValue('refresh-1')
    vi.mocked(API_RefreshToken).mockRejectedValueOnce(new Error('revoked'))
    http.defaults.adapter = respondWith(401)
    await expect(http.get('/datasources')).rejects.toBeInstanceOf(AxiosError)
    expect(redirectToLoginExpired).toHaveBeenCalledTimes(1)

    vi.mocked(redirectToLoginExpired).mockReset()
    vi.mocked(API_RefreshToken).mockResolvedValueOnce({
      access_token: 'still-bad',
      refresh_token: 'r',
      token_type: 'bearer',
      user: { user_id: 1, username: 'admin', role: 'ADMIN' },
    })
    await expect(http.get('/datasources')).rejects.toBeInstanceOf(AxiosError)
    expect(API_RefreshToken).toHaveBeenCalledTimes(2)
    expect(redirectToLoginExpired).toHaveBeenCalledTimes(1)
  })

  it('không chuyển trang khi chưa đăng nhập hoặc lỗi khác 401', async () => {
    http.defaults.adapter = respondWith(401)
    await expect(http.get('/datasources')).rejects.toBeInstanceOf(AxiosError)

    Cookies.set('access_token', 'ok')
    http.defaults.adapter = respondWith(403)
    await expect(http.get('/datasources')).rejects.toBeInstanceOf(AxiosError)

    expect(redirectToLoginExpired).not.toHaveBeenCalled()
  })
})
