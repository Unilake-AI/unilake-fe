import type { DataSourceConfigField, SourceType } from '@/types/data-sources'

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

/** Khoá cấu hình theo loại nguồn, khớp `REQUIRED_CONFIG` trong `backend/app/repositories/datasource_repo.py`. */
export const SOURCE_TYPE_CONFIG: Record<
  SourceType,
  { label: string; connectionType: string; locationHint: string; fields: DataSourceConfigField[] }
> = {
  CSV: {
    label: 'CSV',
    connectionType: 'FILE',
    locationHint: 's3://unilake-raw/admissions/2026/applicants.csv',
    fields: [
      {
        key: 'delimiter',
        label: 'Ký tự ngăn cách',
        kind: 'text',
        required: true,
        defaultValue: ',',
      },
      {
        key: 'encoding',
        label: 'Bảng mã văn bản',
        kind: 'text',
        required: true,
        defaultValue: 'utf-8',
      },
      {
        key: 'has_header',
        label: 'Dòng đầu là tiêu đề',
        kind: 'boolean',
        required: true,
        defaultValue: 'true',
      },
      {
        key: 'quote_char',
        label: 'Dấu bao quanh nội dung',
        kind: 'text',
        required: false,
        defaultValue: '"',
      },
    ],
  },
  EXCEL: {
    label: 'Excel',
    connectionType: 'FILE',
    locationHint: 's3://unilake-raw/academic/2026-1/enrollment.xlsx',
    fields: [
      {
        key: 'sheet_name',
        label: 'Tên trang tính',
        kind: 'text',
        required: true,
        defaultValue: 'Sheet1',
      },
      {
        key: 'header_row',
        label: 'Số thứ tự dòng tiêu đề',
        kind: 'number',
        required: true,
        defaultValue: '1',
        hint: 'Đếm từ 1',
      },
      {
        key: 'skip_rows',
        label: 'Số dòng bỏ qua',
        kind: 'number',
        required: true,
        defaultValue: '0',
      },
    ],
  },
  JSON: {
    label: 'JSON',
    connectionType: 'FILE',
    locationHint: 's3://unilake-raw/hr/qualification.json',
    fields: [
      {
        key: 'encoding',
        label: 'Bảng mã văn bản',
        kind: 'text',
        required: true,
        defaultValue: 'utf-8',
      },
    ],
  },
  REST_API: {
    label: 'REST API',
    connectionType: 'REST',
    locationHint: 'https://api.uni.edu.vn/hr/employees',
    fields: [
      {
        key: 'method',
        label: 'Cách gửi yêu cầu',
        kind: 'select',
        required: true,
        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        defaultValue: 'GET',
      },
      {
        key: 'timeout_seconds',
        label: 'Thời gian chờ (giây)',
        kind: 'number',
        required: true,
        defaultValue: '30',
      },
      {
        key: 'headers',
        label: 'Thông tin gửi kèm',
        kind: 'json',
        required: true,
        defaultValue: '{}',
        hint: 'Khoá và giá trị đều là văn bản',
      },
      {
        key: 'pagination',
        label: 'Cách lấy dữ liệu theo từng trang',
        kind: 'json',
        required: true,
        defaultValue: '{"type": "none"}',
      },
    ],
  },
  POSTGRESQL: {
    label: 'PostgreSQL',
    connectionType: 'RDBMS',
    locationHint: 'postgres://db.uni.edu.vn:5432/unilake_source',
    fields: [
      {
        key: 'host',
        label: 'Máy chủ (Host)',
        kind: 'text',
        required: true,
        defaultValue: 'localhost',
      },
      {
        key: 'port',
        label: 'Cổng (Port)',
        kind: 'number',
        required: true,
        defaultValue: '5432',
      },
      {
        key: 'database',
        label: 'Tên cơ sở dữ liệu',
        kind: 'text',
        required: true,
        defaultValue: '',
      },
      {
        key: 'username',
        label: 'Tên đăng nhập',
        kind: 'text',
        required: true,
        defaultValue: '',
      },
      {
        key: 'password',
        label: 'Mật khẩu',
        kind: 'password',
        required: true,
        defaultValue: '',
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
        errors[field.key] = 'Vui lòng điền mục này.'
      }
      continue
    }
    switch (field.kind) {
      case 'number': {
        const value = Number(raw)
        if (!Number.isInteger(value)) {
          errors[field.key] = 'Vui lòng nhập số nguyên.'
        } else if (field.key === 'header_row' && value < 1) {
          errors[field.key] = 'Vui lòng nhập số từ 1 trở lên.'
        } else if (field.key === 'port' && (value < 1 || value > 65535)) {
          errors[field.key] = 'Cổng kết nối phải từ 1 đến 65535.'
        } else if (field.key === 'timeout_seconds' && value <= 0) {
          errors[field.key] = 'Thời gian chờ phải lớn hơn 0 giây.'
        } else if (value < 0) {
          errors[field.key] = 'Vui lòng nhập số từ 0 trở lên.'
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
            errors[field.key] = 'Vui lòng nhập thông tin theo mẫu.'
          } else if (
            field.key === 'headers' &&
            !Object.values(parsed as Record<string, unknown>).every((v) => typeof v === 'string')
          ) {
            errors[field.key] = 'Vui lòng đặt các giá trị trong dấu ngoặc kép.'
          } else {
            configuration[field.key] = parsed
          }
        } catch {
          errors[field.key] = 'Thông tin chưa đúng định dạng. Vui lòng kiểm tra lại theo mẫu.'
        }
        break
      }
      default:
        configuration[field.key] = field.key === 'delimiter' ? (values[field.key] ?? '') : raw
    }
  }

  return { configuration, errors }
}
