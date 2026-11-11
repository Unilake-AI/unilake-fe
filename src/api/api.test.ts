import { describe, expect, it, vi } from 'vitest'

import { normalizeApiUrl } from './api'

describe('normalizeApiUrl', () => {
  it('dùng localhost:8000 khi chưa cấu hình', () => {
    expect(normalizeApiUrl(undefined)).toBe('http://localhost:8000')
    expect(normalizeApiUrl('  ')).toBe('http://localhost:8000')
  })

  it('bỏ hậu tố /api/v1 và dấu / ở cuối', () => {
    expect(normalizeApiUrl('http://localhost:8000/api/v1')).toBe('http://localhost:8000')
    expect(normalizeApiUrl('http://localhost:8000/api/v1/')).toBe('http://localhost:8000')
    expect(normalizeApiUrl('https://api.unilake.vn/')).toBe('https://api.unilake.vn')
  })
})

describe('chính sách giao thức backend', () => {
  it.each(['http://localhost:8000', 'http://127.0.0.1:8000', 'http://10.96.134.207:8000'])(
    'chỉ cho phép %s trong development',
    (url) => {
      expect(normalizeApiUrl(url, 'development')).toBe(url)
      expect(() => normalizeApiUrl(url, 'production')).toThrow(/HTTPS/)
    }
  )

  it('production chấp nhận URL HTTPS được cấu hình', () => {
    expect(normalizeApiUrl('https://backend.example/api/v1/', 'production')).toBe(
      'https://backend.example'
    )
  })

  it.each([
    'http://backend.example',
    'http://10.96.134.207.example',
    'http://localhost.evil.example',
    'ftp://backend.example',
    '/api/proxy',
    'invalid',
    'https://user:pass@backend.example',
    'https://backend.example?key=value',
    'https://backend.example#fragment',
  ])('từ chối URL không phù hợp: %s', (url) => {
    expect(() => normalizeApiUrl(url, 'development')).toThrow(/NEXT_PUBLIC_API_URL/)
  })

  it('ưu tiên API_BASE_URL và chỉ thêm một tiền tố /api/v1', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://10.96.134.207:8000/api/v1')
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://backend.example')
    vi.resetModules()
    try {
      await expect(import('./api')).resolves.toMatchObject({
        API_BASE_URL: 'http://10.96.134.207:8000/api/v1',
      })
    } finally {
      vi.unstubAllEnvs()
      vi.resetModules()
    }
  })

  it.each([undefined, ''])('module dùng localhost khi cấu hình production là %j', async (value) => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', undefined)
    vi.stubEnv('NEXT_PUBLIC_API_URL', value)
    vi.resetModules()
    try {
      await expect(import('./api')).resolves.toMatchObject({
        API_URL: 'http://localhost:8000',
        API_BASE_URL: 'http://localhost:8000/api/v1',
      })
    } finally {
      vi.unstubAllEnvs()
      vi.resetModules()
    }
  })

  it('module cấu hình từ chối HTTP ngay khi khởi tạo production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', undefined)
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:8000')
    vi.resetModules()
    try {
      await expect(import('./api')).rejects.toThrow(/HTTPS/)
    } finally {
      vi.unstubAllEnvs()
      vi.resetModules()
    }
  })
})
