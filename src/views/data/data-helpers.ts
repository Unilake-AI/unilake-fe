export const DATA_DOMAINS = [
  { value: 'hr', label: 'Nhân sự (hr)' },
  { value: 'academic', label: 'Đào tạo (academic)' },
  { value: 'admissions', label: 'Tuyển sinh (admissions)' },
] as const

export const ACTIVE_INGESTION_STATUSES = new Set(['QUEUED', 'RUNNING', 'RETRY_WAIT'])
export const POLL_INTERVAL_MS = 4000

export function isJobActive(
  input: string | { status?: string | null } | null | undefined
): boolean {
  const status = typeof input === 'string' ? input : input?.status
  return ACTIVE_INGESTION_STATUSES.has((status ?? '').toUpperCase())
}

export function isJobRetryEligible(job: { status: string; job_type?: string | null }): boolean {
  return job.status.toUpperCase() === 'FAILED' && (job.job_type ?? '').toUpperCase() === 'UPLOAD_V1'
}

export function domainLabel(domain: string | null | undefined): string {
  switch ((domain ?? '').toLowerCase()) {
    case 'hr':
      return 'Nhân sự'
    case 'academic':
      return 'Đào tạo'
    case 'admissions':
      return 'Tuyển sinh'
    default:
      return domain || '—'
  }
}

export function jobTypeLabel(jobType: string | null | undefined): string {
  switch ((jobType ?? '').toUpperCase()) {
    case 'UPLOAD_V1':
      return 'Tải tệp lên (UPLOAD_V1)'
    case 'EXECUTION_V1':
      return 'Nguồn đăng ký (EXECUTION_V1)'
    default:
      return jobType || '—'
  }
}

export function formatSeconds(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—'
  if (seconds < 60) return `${seconds.toFixed(1)} giây`
  return `${(seconds / 60).toFixed(1)} phút`
}

export function formatCellValue(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value)
}

export function extractSafeValidationDetails(
  report: Record<string, unknown> | null | undefined
): string[] {
  if (!report) return []
  const details: string[] = []
  if (typeof report.reason === 'string' && report.reason.trim()) {
    details.push(report.reason.trim())
  }
  if (typeof report.message === 'string' && report.message.trim()) {
    details.push(report.message.trim())
  }
  if (Array.isArray(report.errors)) {
    for (const entry of report.errors.slice(0, 5)) {
      if (typeof entry === 'string' && entry.trim()) {
        details.push(entry.trim())
      } else if (entry !== null && typeof entry === 'object') {
        const msg = (entry as Record<string, unknown>).message
        if (typeof msg === 'string' && msg.trim()) {
          details.push(msg.trim())
        }
      }
    }
  }
  return details
}
