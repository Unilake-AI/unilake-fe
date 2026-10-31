import { describe, expect, it } from 'vitest'

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
