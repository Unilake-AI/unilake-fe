import { AxiosError, AxiosHeaders } from 'axios'
import Cookies from 'js-cookie'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { API_BASE_URL, API_TIMEOUT } from '@/api/api'
import { http } from '@/api/http'
import { redirectToLoginExpired } from '@/lib/session'
import type * as SessionModule from '@/lib/session'

import { API_Logout, API_RefreshToken, API_SignIn } from './client'

vi.mock('@/lib/session', async (importOriginal) => ({
  ...(await importOriginal<typeof SessionModule>()),
  redirectToLoginExpired: vi.fn(),
}))

describe('client xác thực dùng chung http', () => {
  const originalAdapter = http.defaults.adapter
  afterEach(() => {
    http.defaults.adapter = originalAdapter
    Cookies.remove('access_token')
    Cookies.remove('refresh_token')
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('dùng chung URL/timeout và giữ endpoint, payload, response.data', async () => {
    expect(http.defaults.baseURL).toBe(API_BASE_URL)
    expect(http.defaults.timeout).toBe(API_TIMEOUT)
    const requests: { url?: string; data: unknown }[] = []
    const data = { access_token: 'test', token_type: 'bearer' }
    Cookies.set('access_token', 'session')
    http.defaults.adapter = (config) => {
      expect(config.headers.has('Authorization')).toBe(false)
      requests.push({ url: config.url, data: JSON.parse(String(config.data)) })
      return Promise.resolve({ data, status: 200, statusText: '', headers: {}, config })
    }
    expect(await API_SignIn({ username: 'user', password: 'test' })).toBe(data)
    expect(await API_RefreshToken('refresh')).toBe(data)
    await API_Logout('refresh')
    expect(requests).toEqual([
      { url: '/auth/login', data: { username: 'user', password: 'test' } },
      { url: '/auth/refresh', data: { refresh_token: 'refresh' } },
      { url: '/auth/logout', data: { refresh_token: 'refresh' } },
    ])
  })

  it.each([
    ['login', () => API_SignIn({ username: 'user', password: 'test' })],
    ['refresh', () => API_RefreshToken('revoked')],
    ['logout', () => API_Logout('revoked')],
  ])('401 %s không refresh hoặc chuyển trang', async (_name, request) => {
    Cookies.set('access_token', 'expired')
    Cookies.set('refresh_token', 'revoked')
    let calls = 0
    http.defaults.adapter = (config) => {
      calls++
      return Promise.reject(
        new AxiosError('fail', 'ERR_BAD_REQUEST', config, undefined, {
          data: {},
          status: 401,
          statusText: '',
          headers: new AxiosHeaders(),
          config,
        })
      )
    }
    await expect(request()).rejects.toBeInstanceOf(AxiosError)
    expect(calls).toBe(1)
    expect(redirectToLoginExpired).not.toHaveBeenCalled()
  })

  it('nhiều API nghiệp vụ 401 chỉ gọi một refresh qua cùng http', async () => {
    Cookies.set('access_token', 'expired')
    Cookies.set('refresh_token', 'refresh')
    let refreshCalls = 0
    http.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') {
        refreshCalls++
        expect(config.headers.has('Authorization')).toBe(false)
        await Promise.resolve()
        return {
          data: { access_token: 'fresh', refresh_token: 'next', token_type: 'bearer' },
          status: 200,
          statusText: '',
          headers: {},
          config,
        }
      }
      if (config.headers.get('Authorization') !== 'Bearer fresh') {
        throw new AxiosError('expired', 'ERR_BAD_REQUEST', config, undefined, {
          data: {},
          status: 401,
          statusText: '',
          headers: {},
          config,
        })
      }
      return { data: {}, status: 200, statusText: '', headers: {}, config }
    }
    await Promise.all([http.get('/a'), http.get('/b'), http.get('/c')])
    expect(refreshCalls).toBe(1)
    expect(Cookies.get('access_token')).toBe('fresh')
    expect(redirectToLoginExpired).not.toHaveBeenCalled()
  })
})
