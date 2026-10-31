import { describe, expect, it } from 'vitest'

import { SOURCE_TYPE_CONFIG, buildConfiguration } from './data-sources'

describe('buildConfiguration', () => {
  it('tạo cấu hình CSV đúng kiểu với giá trị mặc định', () => {
    const values = Object.fromEntries(
      SOURCE_TYPE_CONFIG.CSV.fields.map((f) => [f.key, f.defaultValue])
    )
    expect(buildConfiguration('CSV', values)).toEqual({
      configuration: { delimiter: ',', encoding: 'utf-8', has_header: true, quote_char: '"' },
      errors: {},
    })
  })

  it('báo lỗi khi thiếu khoá bắt buộc, bỏ qua khoá tuỳ chọn để trống', () => {
    const result = buildConfiguration('CSV', {
      delimiter: '',
      encoding: 'utf-8',
      has_header: 'false',
    })
    expect(result.errors).toEqual({ delimiter: 'delimiter là bắt buộc với CSV.' })
    expect(result.configuration).not.toHaveProperty('quote_char')
  })

  it('kiểm tra số nguyên và giới hạn của Excel', () => {
    const result = buildConfiguration('EXCEL', {
      sheet_name: 'Data',
      header_row: '0',
      skip_rows: '1.5',
    })
    expect(result.errors.header_row).toMatch(/header_row/)
    expect(result.errors.skip_rows).toMatch(/số nguyên/)

    const ok = buildConfiguration('EXCEL', { sheet_name: 'Data', header_row: '2', skip_rows: '0' })
    expect(ok).toEqual({
      configuration: { sheet_name: 'Data', header_row: 2, skip_rows: 0 },
      errors: {},
    })
  })

  it('phân tích JSON của REST API và từ chối header không phải chuỗi', () => {
    const ok = buildConfiguration('REST_API', {
      method: 'GET',
      timeout_seconds: '30',
      headers: '{"Accept": "application/json"}',
      pagination: '{"type": "none"}',
    })
    expect(ok.errors).toEqual({})
    expect(ok.configuration).toEqual({
      method: 'GET',
      timeout_seconds: 30,
      headers: { Accept: 'application/json' },
      pagination: { type: 'none' },
    })

    const bad = buildConfiguration('REST_API', {
      method: 'GET',
      timeout_seconds: '0',
      headers: '{"X-Retry": 3}',
      pagination: '[1]',
    })
    expect(Object.keys(bad.errors).sort()).toEqual(['headers', 'pagination', 'timeout_seconds'])
  })
})
