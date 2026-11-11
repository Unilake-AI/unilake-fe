import type { StaffDomainChoice } from '@/types/staff-context'

export const ACTIVE_INGESTION_STATUSES = new Set(['QUEUED', 'RUNNING', 'RETRY_WAIT'])
export const INGESTION_POLL_INTERVAL_MS = 4000
export const BRONZE_SUCCESS_MESSAGE =
  'Đã lưu dữ liệu vào Bronze. Đang chờ quản trị dữ liệu xử lý Silver.'

export const UPLOAD_FILENAME_REGEX = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,199}$/

export const CSV_ENCODING_OPTIONS = [
  { value: 'utf-8', label: 'UTF-8 (Mặc định)' },
  { value: 'utf-8-sig', label: 'UTF-8 with BOM (utf-8-sig)' },
  { value: 'cp1258', label: 'Windows-1258 (cp1258)' },
  { value: 'latin-1', label: 'Latin-1 (ISO-8859-1)' },
] as const

export const CSV_DELIMITER_OPTIONS = [
  { value: ',', label: 'Dấu phẩy (,)' },
  { value: ';', label: 'Dấu chấm phẩy (;)' },
  { value: '\t', label: 'Tab (\\t)' },
  { value: '|', label: 'Dấu gạch đứng (|)' },
] as const

export const CSV_QUOTE_CHAR_OPTIONS = [
  { value: '"', label: 'Nháy kép (")' },
  { value: "'", label: "Nháy đơn (')" },
] as const

export function isIngestionJobActive(status: string | null | undefined): boolean {
  return ACTIVE_INGESTION_STATUSES.has((status ?? '').toUpperCase())
}

export function getFileExtension(filename: string): string {
  const index = filename.lastIndexOf('.')
  return index >= 0 ? filename.slice(index).toLowerCase() : ''
}

export function isCsvFilename(filename: string): boolean {
  return getFileExtension(filename) === '.csv'
}

export function isExcelFilename(filename: string): boolean {
  const ext = getFileExtension(filename)
  return ext === '.xlsx' || ext === '.xlsm'
}

export function isValidUploadFilename(filename: string): boolean {
  return UPLOAD_FILENAME_REGEX.test(filename)
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(2)} MB`
}

export function jobTypeLabel(jobType: string | null | undefined): string {
  switch ((jobType ?? '').toUpperCase()) {
    case 'UPLOAD_V1':
      return 'Tải tệp lên'
    case 'EXECUTION_V1':
      return 'Thu thập nguồn'
    default:
      return jobType || '—'
  }
}

const DOMAIN_FALLBACK_LABELS: Record<string, string> = {
  hr: 'Nhân sự',
  academic: 'Đào tạo',
  admissions: 'Tuyển sinh',
}

export function domainLabel(domain: string, choices?: StaffDomainChoice[]): string {
  const matched = choices?.find((choice) => choice.domain === domain)
  if (matched) return matched.name
  return DOMAIN_FALLBACK_LABELS[domain] ?? domain
}

export function extractSafeValidationDetails(
  report: Record<string, unknown> | null | undefined
): string[] {
  if (!report) return []
  const items: string[] = []
  if (typeof report.reason === 'string' && report.reason.trim()) {
    items.push(report.reason.trim())
  }
  if (typeof report.message === 'string' && report.message.trim()) {
    items.push(report.message.trim())
  }
  if (Array.isArray(report.errors)) {
    for (const err of report.errors.slice(0, 5)) {
      if (typeof err === 'string' && err.trim()) {
        items.push(err.trim())
      } else if (err !== null && typeof err === 'object') {
        const msg = (err as Record<string, unknown>).message
        if (typeof msg === 'string' && msg.trim()) {
          items.push(msg.trim())
        }
      }
    }
  }
  return items
}
