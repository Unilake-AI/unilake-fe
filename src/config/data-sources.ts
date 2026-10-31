import type { SourceType } from '@/types/data'

/**
 * Hệ thống nguồn theo seed `infra/postgres/seed/04-source-systems.sql`.
 * Backend chưa có API liệt kê source system nên frontend dùng danh sách này làm mặc định.
 */
export const SOURCE_SYSTEMS = [
  { id: 1, code: 'ADM_SYS', name: 'Admissions System' },
  { id: 2, code: 'ACA_SYS', name: 'Academic System' },
  { id: 3, code: 'HR_SYS', name: 'Human Resources System' },
  { id: 4, code: 'FILE_SHARE', name: 'Shared File Storage' },
] as const

export interface ConfigField {
  key: string
  label: string
  kind: 'text' | 'number' | 'boolean' | 'select' | 'json'
  required: boolean
  options?: string[]
  defaultValue: string
  hint?: string
}

/** Khoá cấu hình theo loại nguồn, khớp `REQUIRED_CONFIG` trong `backend/app/repositories/datasource_repo.py`. */
export const SOURCE_TYPE_CONFIG: Record<
  SourceType,
  { label: string; connectionType: string; locationHint: string; fields: ConfigField[] }
> = {
  CSV: {
    label: 'CSV',
    connectionType: 'FILE',
    locationHint: 's3://unilake-raw/admissions/2026/applicants.csv',
    fields: [
      { key: 'delimiter', label: 'delimiter', kind: 'text', required: true, defaultValue: ',' },
      { key: 'encoding', label: 'encoding', kind: 'text', required: true, defaultValue: 'utf-8' },
      {
        key: 'has_header',
        label: 'has_header',
        kind: 'boolean',
        required: true,
        defaultValue: 'true',
      },
      { key: 'quote_char', label: 'quote_char', kind: 'text', required: false, defaultValue: '"' },
    ],
  },
  EXCEL: {
    label: 'Excel',
    connectionType: 'FILE',
    locationHint: 's3://unilake-raw/academic/2026-1/enrollment.xlsx',
    fields: [
      {
        key: 'sheet_name',
        label: 'sheet_name',
        kind: 'text',
        required: true,
        defaultValue: 'Sheet1',
      },
      {
        key: 'header_row',
        label: 'header_row',
        kind: 'number',
        required: true,
        defaultValue: '1',
        hint: 'Đếm từ 1',
      },
      { key: 'skip_rows', label: 'skip_rows', kind: 'number', required: true, defaultValue: '0' },
    ],
  },
  JSON: {
    label: 'JSON',
    connectionType: 'FILE',
    locationHint: 's3://unilake-raw/hr/qualification.json',
    fields: [
      { key: 'encoding', label: 'encoding', kind: 'text', required: true, defaultValue: 'utf-8' },
    ],
  },
  REST_API: {
    label: 'REST API',
    connectionType: 'REST',
    locationHint: 'https://api.uni.edu.vn/hr/employees',
    fields: [
      {
        key: 'method',
        label: 'method',
        kind: 'select',
        required: true,
        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        defaultValue: 'GET',
      },
      {
        key: 'timeout_seconds',
        label: 'timeout_seconds',
        kind: 'number',
        required: true,
        defaultValue: '30',
      },
      {
        key: 'headers',
        label: 'headers (JSON)',
        kind: 'json',
        required: true,
        defaultValue: '{}',
        hint: 'Khoá và giá trị đều là chuỗi',
      },
      {
        key: 'pagination',
        label: 'pagination (JSON)',
        kind: 'json',
        required: true,
        defaultValue: '{"type": "none"}',
      },
    ],
  },
}

export const SOURCE_TYPES = Object.keys(SOURCE_TYPE_CONFIG) as SourceType[]

/**
 * Đổi giá trị chuỗi trong form thành configuration đúng kiểu backend yêu cầu.
 * Trả về lỗi theo từng khoá nếu giá trị không hợp lệ.
 */
export function buildConfiguration(
  type: SourceType,
  values: Record<string, string>
): { configuration: Record<string, unknown>; errors: Record<string, string> } {
  const configuration: Record<string, unknown> = {}
  const errors: Record<string, string> = {}

  for (const field of SOURCE_TYPE_CONFIG[type].fields) {
    const raw = (values[field.key] ?? '').trim()
    if (raw === '') {
      if (field.required) {
        errors[field.key] = `${field.key} là bắt buộc với ${SOURCE_TYPE_CONFIG[type].label}.`
      }
      continue
    }
    switch (field.kind) {
      case 'number': {
        const value = Number(raw)
        if (!Number.isInteger(value)) {
          errors[field.key] = `${field.key} phải là số nguyên.`
        } else if (field.key === 'header_row' && value < 1) {
          errors[field.key] = 'header_row phải lớn hơn hoặc bằng 1.'
        } else if (field.key === 'timeout_seconds' && value <= 0) {
          errors[field.key] = 'timeout_seconds phải lớn hơn 0.'
        } else if (value < 0) {
          errors[field.key] = `${field.key} không được âm.`
        } else {
          configuration[field.key] = value
        }
        break
      }
      case 'boolean':
        configuration[field.key] = raw === 'true'
        break
      case 'json': {
        try {
          const parsed: unknown = JSON.parse(raw)
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            errors[field.key] = `${field.key} phải là một object JSON.`
          } else if (
            field.key === 'headers' &&
            !Object.values(parsed as Record<string, unknown>).every((v) => typeof v === 'string')
          ) {
            errors[field.key] = 'headers chỉ chứa giá trị dạng chuỗi.'
          } else {
            configuration[field.key] = parsed
          }
        } catch {
          errors[field.key] = `${field.key} không phải JSON hợp lệ.`
        }
        break
      }
      default:
        configuration[field.key] = field.key === 'delimiter' ? (values[field.key] ?? '') : raw
    }
  }

  return { configuration, errors }
}
