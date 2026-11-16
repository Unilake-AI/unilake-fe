export type CleaningIssue = Record<string, unknown>
export type IssueLevel = 'error' | 'warning' | 'information'

export function reportText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return value === null || value === undefined ? '' : (JSON.stringify(value) ?? '')
}

export function issueLevel(issue: CleaningIssue): IssueLevel {
  const severity = reportText(issue.severity).toUpperCase()
  const disposition = reportText(issue.disposition).toUpperCase()
  if (['ERROR', 'CRITICAL'].includes(severity) || disposition === 'QUARANTINED') return 'error'
  if (['WARNING', 'WARN'].includes(severity)) return 'warning'
  if (severity === 'INFO' || ['PRESERVED', 'NORMALIZED', 'COLLAPSED'].includes(disposition))
    return 'information'
  return 'warning'
}

export const issueLabels: Record<IssueLevel, string> = {
  error: 'Lỗi cần kiểm tra',
  warning: 'Cảnh báo',
  information: 'Ghi nhận xử lý hợp lệ',
}

const descriptions: Record<string, string> = {
  NULL_VALUE_PRESERVED: 'Ô trống được giữ nguyên theo quy định',
  NULL_TOKEN_NORMALIZED: 'Giá trị được chuyển về ô trống theo lựa chọn đã xác nhận',
  TRIM_APPLIED: 'Đã bỏ khoảng trắng ở đầu và cuối nội dung',
  SOURCE_ID_STORED_AS_TEXT: 'Mã nguồn được lưu dạng chữ để giữ cách viết ban đầu',
  EXACT_DUPLICATE_DETECTED: 'Phát hiện dòng giống nhau; đã giữ lại theo lựa chọn',
  EXACT_DUPLICATE_COLLAPSED: 'Đã gộp dòng trùng hoàn toàn theo lựa chọn',
  REQUIRED_VALUE_MISSING: 'Thiếu giá trị bắt buộc',
  REQUIRED_FIELD_MISSING: 'Thiếu cột bắt buộc',
  DUPLICATE_KEY_COLLISION: 'Có nhiều dòng dùng chung mã cần phân biệt',
  DUPLICATE_PRIMARY_KEY_CONFLICT: 'Cùng mã nhưng nội dung khác nhau',
}

export function issueDescription(issue: CleaningIssue): string {
  return (
    descriptions[reportText(issue.code)] ??
    (issueLevel(issue) === 'error'
      ? 'Dữ liệu cần được kiểm tra theo quy định'
      : issueLevel(issue) === 'warning'
        ? 'Cần xem lại ghi nhận này'
        : 'Thao tác xử lý đã được ghi nhận')
  )
}

export function reportIssues(report: Record<string, unknown>): CleaningIssue[] {
  return Array.isArray(report.issues)
    ? report.issues.filter(
        (issue): issue is CleaningIssue =>
          typeof issue === 'object' && issue !== null && !Array.isArray(issue)
      )
    : []
}

function csvCell(value: unknown): string {
  let text = reportText(value)
  // Tên cột hoặc nội dung từ nguồn được xuất như chữ, không được Excel hiểu thành công thức.
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export function cleaningReportCsv(report: Record<string, unknown>): string {
  const publication =
    typeof report.publication === 'object' && report.publication !== null
      ? (report.publication as Record<string, unknown>)
      : {}
  const rows: unknown[][] = [
    ['Thông tin', 'Giá trị'],
    ['Lượt xử lý', report.run_id],
    ['Lần nạp', report.ingestion_job_id],
    ['Trạng thái xử lý', report.cleaning_status ?? report.status],
    ['Trạng thái xuất bản', report.publication_status ?? publication.status ?? report.status],
    ['Phiên bản Silver', report.silver_snapshot_id ?? publication.snapshot_id],
    ['Số dòng đã đọc', report.records_read],
    ['Số dòng đạt', report.records_passed],
    ['Số dòng cách ly', report.records_quarantined],
    ['Số dòng gộp', report.records_collapsed],
    ['Số dòng xuất bản', report.records_published ?? publication.records_published],
    ['Bắt đầu', report.started_at],
    ['Hoàn tất', report.finished_at],
    [
      'Số ghi nhận lỗi',
      reportIssues(report).filter((issue) => issueLevel(issue) === 'error').length,
    ],
    ['Số cảnh báo', reportIssues(report).filter((issue) => issueLevel(issue) === 'warning').length],
    [
      'Số ghi nhận xử lý hợp lệ',
      reportIssues(report).filter((issue) => issueLevel(issue) === 'information').length,
    ],
    [],
    [
      'Mức độ',
      'Mã thông báo',
      'Nội dung',
      'Cột dữ liệu',
      'Vị trí trong nguồn',
      'Cách xử lý',
      'Quy định',
    ],
  ]
  for (const issue of reportIssues(report))
    rows.push([
      issueLabels[issueLevel(issue)],
      issue.code,
      issueDescription(issue),
      issue.field ?? (Array.isArray(issue.key_fields) ? issue.key_fields.join(', ') : ''),
      issue.locator,
      issue.disposition,
      issue.rule_id,
    ])
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function downloadCleaningReport(
  report: Record<string, unknown>,
  runId: string,
  format: 'json' | 'csv'
): void {
  const content = format === 'json' ? JSON.stringify(report, null, 2) : cleaningReportCsv(report)
  const blob = new Blob([content], {
    type: format === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const revoke = URL.revokeObjectURL.bind(URL)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `cleaning-report-${runId}.${format}`
  document.body.append(anchor)
  try {
    anchor.click()
  } finally {
    anchor.remove()
    // Giữ đường dẫn đủ lâu để trình duyệt bắt đầu tải file trước khi thu hồi.
    window.setTimeout(() => revoke(url), 1000)
  }
}
