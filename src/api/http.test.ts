import { AxiosError, AxiosHeaders } from 'axios'
import Cookies from 'js-cookie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { API_RefreshToken } from '@/api/api_auth'
import { readRefreshToken, redirectToLoginExpired, storeSession } from '@/lib/session'

import {
  getApiErrorDetails,
  getApiErrorMessage,
  getApiRequestId,
  http,
  shouldRetryRequest,
} from './http'

import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'

vi.mock('@/lib/session', () => ({
  redirectToLoginExpired: vi.fn(),
  readRefreshToken: vi.fn(),
  storeSession: vi.fn(),
}))
vi.mock('@/api/api_auth', () => ({ API_RefreshToken: vi.fn() }))

function errorWith(status: number, data: unknown, headers: Record<string, string> = {}) {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  return new AxiosError('fail', 'ERR_BAD_RESPONSE', config, undefined, {
    status,
    statusText: '',
    headers: new AxiosHeaders(headers),
    config,
    data,
  })
}

describe('getApiErrorMessage', () => {
  it('ưu tiên thông báo backend trả về', () => {
    const error = errorWith(422, { error: { code: 'X', message: 'Tên nguồn đã tồn tại' } })
    expect(getApiErrorMessage(error, 'mặc định')).toBe('Tên nguồn đã tồn tại')
    expect(getApiErrorMessage(errorWith(400, { detail: 'Sai dữ liệu' }), 'mặc định')).toBe(
      'Sai dữ liệu'
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
    expect(getApiErrorMessage(error, 'x')).toBe('Máy chủ đang gặp sự cố. Vui lòng thử lại sau.')
  })

  it('báo mất kết nối và quá thời gian chờ', () => {
    expect(getApiErrorMessage(new AxiosError('net', 'ERR_NETWORK'), 'x')).toMatch(
      /Không thể kết nối/
    )
    expect(getApiErrorMessage(new AxiosError('slow', 'ECONNABORTED'), 'x')).toMatch(/quá lâu/)
    expect(getApiErrorMessage(new Error('khác'), 'mặc định')).toBe('mặc định')
  })
})

describe('lỗi kiểm tra dữ liệu của FastAPI (422)', () => {
  const error = errorWith(422, {
    detail: [
      { type: 'missing', loc: ['body', 'username'], msg: 'Field required' },
      { type: 'missing', loc: ['body', 'password'], msg: 'Field required' },
    ],
  })

  it('hiện câu chung và liệt kê từng trường lỗi', () => {
    expect(getApiErrorMessage(error, 'x')).toMatch(/không hợp lệ/)
    expect(getApiErrorDetails(error)).toEqual([
      'username: Field required',
      'password: Field required',
    ])
  })

  it('vẫn đọc details.errors của envelope chuẩn', () => {
    const envelope = errorWith(422, {
      error: { details: { errors: ['Missing required configuration: encoding'] } },
    })
    expect(getApiErrorDetails(envelope)).toEqual(['Missing required configuration: encoding'])
    expect(getApiErrorDetails(new Error('x'))).toEqual([])
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

describe('getApiRequestId', () => {
  it('lấy request_id từ envelope lỗi hoặc header', () => {
    expect(getApiRequestId(errorWith(500, { error: { request_id: 'req_01' } }))).toBe('req_01')
    expect(getApiRequestId(errorWith(500, {}, { 'x-request-id': 'req_02' }))).toBe('req_02')
    expect(getApiRequestId(errorWith(500, {}))).toBeUndefined()
    expect(getApiRequestId(new Error('x'))).toBeUndefined()
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
