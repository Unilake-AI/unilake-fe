'use client'

import { useState } from 'react'

import { useMutation, useQuery } from '@tanstack/react-query'

import { getApiErrorMessage } from '@/api/http'
import { API_DownloadAdmissionsUpdate, API_GetStaffImportReport } from '@/api/staff/upload'
import { Button, ErrorState, formatNumber } from '@/components/page/page-parts'
import type {
  StaffImportIssue,
  StaffImportLayout,
  StaffImportReport,
  StaffImportType,
} from '@/types/staff-upload'

import { INGESTION_POLL_INTERVAL_MS } from './staff-helpers'

export const ignoreSourceColumn = '__ignore__'

const issueMessages: Record<string, string> = {
  IMPORT_COLUMN_REQUIRED: 'Thiếu cột bắt buộc',
  IMPORT_MAPPING_AMBIGUOUS: 'Có nhiều cột cùng khớp. Hãy chọn cột sẽ dùng.',
  IMPORT_MAPPING_REQUIRED: 'Cột chưa được ánh xạ',
  IMPORT_MAPPING_INVALID: 'Ánh xạ cột chưa hợp lệ',
  IMPORT_COLUMN_USED_TWICE_OR_UNKNOWN: 'Mỗi cột chỉ được dùng một lần',
  IMPORT_VALUE_REQUIRED: 'Thiếu giá trị bắt buộc',
  IMPORT_REQUIRED_FIELD: 'Thiếu giá trị bắt buộc',
  IMPORT_VALUE_INVALID: 'Giá trị không đúng kiểu hoặc không nằm trong danh mục cho phép',
  IMPORT_VALUE_OUT_OF_RANGE: 'Giá trị nằm ngoài giới hạn cho phép',
  IMPORT_DECIMAL_OUT_OF_RANGE: 'Điểm hoặc số thập phân vượt giới hạn độ chính xác',
  IMPORT_DATE_RANGE_INVALID: 'Ngày nằm ngoài khoảng cho phép',
  IMPORT_REFERENCE_MISSING: 'Mã tham chiếu chưa có trong danh mục',
  IMPORT_REFERENCE_AMBIGUOUS: 'Mã tham chiếu khớp với nhiều bản ghi',
  IMPORT_QUALIFICATION_NAME_AMBIGUOUS: 'Tên văn bằng khớp nhiều mục đã có. Cần rà lại danh mục.',
  IMPORT_QUALIFICATION_TYPE_IN_USE:
    'Văn bằng này đã gắn với hồ sơ nhân viên. Cần rà soát trước khi đổi loại.',
  IMPORT_ADMISSION_YEARS_OVERLAP: 'Khoảng thời gian trùng với một năm tuyển sinh đang mở',
  IMPORT_ADMISSION_METHOD_SCORE_IN_USE: 'Thang điểm mới xung đột với kết quả xét tuyển đã lưu',
  IMPORT_ADMISSION_METHOD_INACTIVE: 'Phương thức đã ngừng nhận hồ sơ đăng ký mới',
  IMPORT_ACADEMIC_ENROLLMENT_REQUIRED: 'Sinh viên chưa đăng ký lớp học phần này',
  IMPORT_GRADE_REQUIRED: 'Mỗi dòng cần có ít nhất một giá trị điểm',
  IMPORT_GRADE_REGISTRATION_DATE_MISMATCH: 'Ngày đăng ký khác với lượt đăng ký học phần',
  IMPORT_CLASS_REFERENCE_CHANGE: 'Mã lớp đã gắn với học phần hoặc học kỳ khác',
  IMPORT_STUDENT_REFERENCE_CHANGE: 'Hồ sơ đã liên kết với chương trình hoặc khóa tuyển sinh khác',
  ADMISSION_REGISTRATION_MISSING: 'Chưa tìm thấy đăng ký tuyển sinh',
  ADMISSION_APPLICANT_MAPPING_MISSING: 'Chưa tìm thấy mã thí sinh trong nguồn của bộ dữ liệu này',
  ADMISSION_REVISION_CONFLICT: 'Hồ sơ đã thay đổi. Hãy tải danh sách cập nhật và đối chiếu lại.',
  ADMISSION_FINAL_RESULT_LOCKED: 'Kết quả đã chốt. Hãy gửi yêu cầu đính chính cho quản lý.',
  ADMISSION_NOT_ACCEPTED: 'Chỉ có thể xác nhận nhập học cho đăng ký đã trúng tuyển',
}

function fieldLabel(workflow: StaffImportType, field: string) {
  return workflow.fields.find((item) => item.name === field)?.aliases[0] ?? field
}

function issueText(issue: StaffImportIssue, workflow?: StaffImportType) {
  const field =
    issue.column || (issue.field && (workflow ? fieldLabel(workflow, issue.field) : issue.field))
  const columns = Array.isArray(issue.columns) ? issue.columns.join(', ') : null
  const message = issue.message ?? issueMessages[issue.code] ?? issue.code
  const location = issue.locator
    ?.replace(/^record:(\d+)$/, 'Bản ghi $1')
    .replace(/^sheet:(.+):row:(\d+)$/, 'Sheet $1, dòng $2')
  return [location, field || columns, message].filter(Boolean).join(' · ')
}

export function ImportLayoutReview({
  workflow,
  columns,
  analysis,
  choices,
  disabled,
  onChoose,
}: {
  workflow: StaffImportType
  columns: string[]
  analysis: StaffImportLayout
  choices: Record<string, string>
  disabled: boolean
  onChoose: (column: string, field: string) => void
}) {
  if (analysis.status === 'MAPPED') return null

  const issues = analysis.issues ?? []
  const usedColumns = new Set(Object.values(analysis.field_mapping))
  const columnsToReview = columns.filter(
    (column) => !usedColumns.has(column) || Object.hasOwn(choices, column)
  )
  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
      <p className="font-semibold" role="alert">
        {analysis.suggested_workflow
          ? `Tệp phù hợp với công việc “${analysis.suggested_workflow}”. Hãy kiểm tra lại lựa chọn.`
          : 'Kiểm tra các cột cần xác nhận'}
      </p>
      <ul className="list-disc space-y-1 pl-4">
        {issues.map((item, index) => (
          <li key={index}>{issueText(item, workflow)}</li>
        ))}
      </ul>
      {!analysis.suggested_workflow &&
        columnsToReview.map((column) => (
          <label className="grid gap-1" key={column}>
            <span className="font-medium">Cột {column}</span>
            <select
              className="min-w-0 rounded border border-amber-300 bg-white px-2 py-1.5"
              value={Object.hasOwn(choices, column) ? choices[column] : ''}
              disabled={disabled}
              onChange={(event) => onChoose(column, event.target.value)}
            >
              <option value="">Chọn trường tương ứng</option>
              {workflow.fields.map(({ name }) => (
                <option
                  key={name}
                  value={name}
                  disabled={Boolean(
                    (analysis.field_mapping[name] && analysis.field_mapping[name] !== column) ||
                    Object.entries(choices).some(
                      ([other, field]) => other !== column && field === name
                    )
                  )}
                >
                  {fieldLabel(workflow, name)}
                </option>
              ))}
              <option value={ignoreSourceColumn}>Không dùng cột này</option>
            </select>
          </label>
        ))}
    </div>
  )
}

export function AdmissionsUpdateDownload({
  datasetId,
  workflow,
}: {
  datasetId: number
  workflow: 'results' | 'enrollment'
}) {
  const [offset, setOffset] = useState(0)
  const download = useMutation({
    mutationFn: () => API_DownloadAdmissionsUpdate(datasetId, workflow, offset),
    onSuccess: ({ blob, nextOffset }) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `danh-sach-${workflow === 'results' ? 'xet-tuyen' : 'nhap-hoc'}-${offset}.csv`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setOffset(nextOffset ?? 0)
    },
  })

  return (
    <div className="space-y-1 text-xs">
      <button
        type="button"
        className="font-medium text-indigo-700 hover:underline disabled:opacity-60"
        disabled={download.isPending}
        onClick={() => download.mutate()}
      >
        {download.isPending
          ? 'Đang tải danh sách…'
          : offset > 0
            ? 'Tải phần tiếp theo'
            : 'Tải danh sách để cập nhật'}
      </button>
      {download.isError && (
        <p role="alert" className="text-rose-700">
          {getApiErrorMessage(download.error, 'Không tải được danh sách cập nhật.')}
        </p>
      )}
    </div>
  )
}

function importFailed(report: StaffImportReport) {
  return (
    ['FAILED', 'QUARANTINED', 'CANCELED', 'EMPTY', 'BLOCKED'].includes(
      report.silver_status ?? ''
    ) ||
    ['FAILED', 'SUPERSEDED'].includes(report.gold_status ?? '') ||
    ['FAILED', 'BLOCKED', 'SUPERSEDED'].includes(report.database_status ?? '')
  )
}

const stageLabels: Record<string, string> = {
  SUCCESS: 'Đã xuất bản',
  SUCCEEDED: 'Đã hoàn tất',
  SYNCED: 'Đã đồng bộ',
  QUEUED: 'Đang chờ',
  RUNNING: 'Đang xử lý',
  RETRY_WAIT: 'Chờ thử lại',
  FAILED: 'Thất bại',
  QUARANTINED: 'Có dòng bị cách ly',
  BLOCKED: 'Cần xử lý lỗi',
  EMPTY: 'Không có dữ liệu',
  CANCELED: 'Đã hủy',
  SUPERSEDED: 'Đã có lượt thay thế',
}

export function StaffBusinessImportStatus({ jobId }: { jobId: number }) {
  const query = useQuery({
    queryKey: ['ingestion-jobs', jobId, 'business-import'],
    queryFn: () => API_GetStaffImportReport(jobId),
    refetchInterval: ({ state }) =>
      state.status === 'error' ||
      (state.data && (state.data.database_committed || importFailed(state.data)))
        ? false
        : INGESTION_POLL_INTERVAL_MS,
  })

  if (query.isPending) return <p role="status">Đang kiểm tra trạng thái Silver, Gold và DB…</p>
  if (query.isError) {
    return (
      <ErrorState
        message={getApiErrorMessage(query.error, 'Không tải được kết quả ghi DB.')}
        retrying={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    )
  }
  const report = query.data
  const failed = importFailed(report)
  const issues = report.error_report?.issues ?? []
  const errorCode =
    report.error_report?.code || report.database_error || report.gold_error || report.silver_error
  return (
    <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3 text-xs">
      <div className="flex flex-wrap justify-between gap-2">
        <p role="status" className="font-semibold text-slate-900">
          {report.database_committed
            ? 'Đã ghi DB'
            : failed
              ? 'Lần nạp chưa ghi được DB'
              : 'Đang xử lý sau Bronze'}
        </p>
        {failed && (
          <Button type="button" variant="ghost" onClick={() => void query.refetch()}>
            Làm mới
          </Button>
        )}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-slate-600">
        {[
          ['Silver', report.silver_status],
          ['Gold', report.gold_status],
          ['Ghi DB', report.database_status],
        ].map(([label, status]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className="font-medium text-slate-900">
              {status ? (stageLabels[status] ?? status) : 'Chưa bắt đầu'}
            </dd>
          </div>
        ))}
      </dl>
      {errorCode && <p className="text-rose-700">{issueMessages[errorCode] ?? errorCode}</p>}
      {issues.length > 0 && (
        <details open>
          <summary className="cursor-pointer font-medium text-rose-800">
            {formatNumber(report.error_report?.issue_count ?? issues.length)} lỗi cần xem
          </summary>
          <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-auto pl-4 text-rose-800">
            {issues.map((issue, index) => (
              <li key={index}>{issueText(issue)}</li>
            ))}
          </ul>
          {(report.error_report?.issue_count ?? 0) > issues.length && (
            <p className="mt-1 text-slate-600">
              Đang hiển thị {formatNumber(issues.length)} lỗi đầu tiên.
            </p>
          )}
        </details>
      )}
    </div>
  )
}
