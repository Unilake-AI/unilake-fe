'use client'

import { useRef, useState } from 'react'
import type { FormEvent } from 'react'

import Link from 'next/link'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Clock,
  FileWarning,
  LoaderCircle,
  Send,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

import { getApiErrorCode, getApiErrorMessage, getErrorMessageForCode } from '@/api/http'
import { API_GetDataset } from '@/api/shared/datasets'
import { API_GetIngestionJob } from '@/api/shared/ingestion'
import type { IngestionJob } from '@/api/shared/ingestion'
import {
  API_GetQualityIssue,
  API_SubmitQualityResolution,
  API_UploadQualityIssueFile,
} from '@/api/shared/quality-issues'
import type { QualityIssueDetail } from '@/api/shared/quality-issues'
import type { StaffContext } from '@/api/shared/staff'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Tag,
  formatDateTime,
  formatNumber,
  statusLabel,
  statusTone,
} from '@/components/page/page-parts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { StaffContextGate } from './staff-context-gate'
import {
  BRONZE_SUCCESS_MESSAGE,
  CSV_DELIMITER_OPTIONS,
  CSV_ENCODING_OPTIONS,
  CSV_QUOTE_CHAR_OPTIONS,
  INGESTION_POLL_INTERVAL_MS,
  domainLabel,
  extractSafeValidationDetails,
  formatBytes,
  getFileExtension,
  isCsvFilename,
  isExcelFilename,
  isIngestionJobActive,
} from './staff-helpers'

const inputClass =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 disabled:bg-slate-50 disabled:text-slate-500'

function eventTypeLabel(eventType: string): string {
  switch (eventType.toUpperCase()) {
    case 'ASSIGNED':
      return 'Giao yêu cầu xử lý'
    case 'ASSIGNEE_CHANGED':
      return 'Chuyển người phụ trách'
    case 'RESOLUTION_SUBMITTED':
      return 'Nhân viên báo đã sửa'
    case 'VERIFIED':
      return 'Quản trị xác minh đạt'
    case 'VERIFICATION_REJECTED':
      return 'Quản trị từ chối xác minh'
    default:
      return eventType
  }
}

function formatEventDetails(details: Record<string, unknown>): string | null {
  const parts: string[] = []
  if (typeof details.note === 'string' && details.note.trim()) {
    parts.push(`Ghi chú: ${details.note.trim()}`)
  }
  if (typeof details.ingestion_job_id === 'number') {
    parts.push(`Job #${details.ingestion_job_id}`)
  }
  if (typeof details.assignee_user_id === 'number') {
    parts.push(`Người phụ trách #${details.assignee_user_id}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

function ReplacementJobStatus({
  jobId,
  initialJob,
  onJobUpdated,
}: {
  jobId: number
  initialJob: IngestionJob
  onJobUpdated?: (job: IngestionJob) => void
}) {
  const query = useQuery({
    queryKey: ['ingestion-jobs', jobId],
    queryFn: async () => {
      const data = await API_GetIngestionJob(jobId)
      onJobUpdated?.(data)
      return data
    },
    initialData: initialJob,
    refetchInterval: (q) =>
      q.state.data && isIngestionJobActive(q.state.data.status)
        ? INGESTION_POLL_INTERVAL_MS
        : false,
  })

  const job = query.data ?? initialJob
  const status = job.status.toUpperCase()
  const validationDetails = extractSafeValidationDetails(job.validation_report)

  return (
    <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-slate-900">
          Theo dõi tệp sửa đã tải lên (Job #{job.ingestion_job_id})
        </span>
        <Tag tone={statusTone(status)}>{statusLabel(status)}</Tag>
      </div>

      {status === 'QUEUED' && (
        <p className="flex items-center gap-1.5 text-amber-800" role="status">
          <Clock className="size-3.5 shrink-0" aria-hidden="true" />
          Đã tiếp nhận tệp sửa (Job #{job.ingestion_job_id}). Đang chờ xử lý; trạng thái yêu cầu
          chưa thay đổi cho tới khi bạn báo đã sửa.
        </p>
      )}

      {status === 'RUNNING' && (
        <p className="flex items-center gap-1.5 text-amber-800" role="status">
          <LoaderCircle className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
          Đang kiểm tra và lưu tệp sửa vào Bronze…
        </p>
      )}

      {status === 'RETRY_WAIT' && (
        <p className="flex items-center gap-1.5 text-amber-800" role="status">
          <Clock className="size-3.5 shrink-0" aria-hidden="true" />
          Hệ thống đang chờ tự động thử lại lần nạp này…
        </p>
      )}

      {status === 'SUCCESS' && (
        <p className="flex items-center gap-1.5 font-medium text-emerald-800" role="status">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
          {BRONZE_SUCCESS_MESSAGE} Bạn có thể gửi báo cáo đã sửa ở bước bên dưới.
        </p>
      )}

      {(status === 'FAILED' || status === 'REJECTED') && (
        <div className="space-y-1 text-rose-800" role="alert">
          <p className="flex items-center gap-1.5 font-semibold">
            <CircleAlert className="size-4 shrink-0 text-rose-600" aria-hidden="true" />
            Tệp sửa chưa thể lưu vào Bronze ({status}). Vui lòng kiểm tra lỗi và tải lên bản mới.
          </p>
          <p>
            {getErrorMessageForCode(job.error_message) ??
              'Tệp không vượt qua bước kiểm tra cấu trúc hoặc lưu trữ.'}
          </p>
          {validationDetails.length > 0 && (
            <ul className="list-disc pl-4 text-rose-700">
              {validationDetails.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {query.isError && (
        <ErrorState
          message={getApiErrorMessage(query.error, 'Không cập nhật được trạng thái lần nạp.')}
          onRetry={() => void query.refetch()}
        />
      )}
    </div>
  )
}

function ResolutionWorkflow({
  context,
  issue,
}: {
  context: StaffContext
  issue: QualityIssueDetail
}) {
  const queryClient = useQueryClient()
  const expectedFilename =
    issue.quarantine_records.find((r) => r.source_table)?.source_table ?? null
  const expectedExt = expectedFilename ? getFileExtension(expectedFilename) : null
  const expectedFormat = expectedFilename
    ? isCsvFilename(expectedFilename)
      ? 'CSV'
      : isExcelFilename(expectedFilename)
        ? 'EXCEL'
        : expectedExt
    : null

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [overrideParser, setOverrideParser] = useState(false)
  const [csvEncoding, setCsvEncoding] = useState('utf-8')
  const [csvDelimiter, setCsvDelimiter] = useState(',')
  const [csvQuoteChar, setCsvQuoteChar] = useState('"')
  const [excelSheetName, setExcelSheetName] = useState('')
  const [excelHeaderRow, setExcelHeaderRow] = useState('1')
  const [skipRows, setSkipRows] = useState('0')

  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadValidationError, setUploadValidationError] = useState<string | null>(null)
  const [uploadedJob, setUploadedJob] = useState<IngestionJob | null>(null)
  const [trackedJobStatus, setTrackedJobStatus] = useState<string | null>(null)

  const [resolutionNote, setResolutionNote] = useState('')
  const [resolutionError, setResolutionError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const latestRejectionEvent = [...issue.history]
    .reverse()
    .find((ev) => ev.event_type.toUpperCase() === 'VERIFICATION_REJECTED')

  const isAssignee = issue.assignee_user_id === context.user_id
  const isAssignedStatus = issue.status === 'ASSIGNED'
  const isEligible = context.can_resolve_issues && isAssignee && isAssignedStatus

  const uploadMutation = useMutation({
    mutationFn: ({
      file,
      parserOptions,
    }: {
      file: File
      parserOptions?: Record<string, unknown>
    }) =>
      API_UploadQualityIssueFile(issue.issue_id, file, parserOptions, (percent) =>
        setUploadProgress(percent)
      ),
    onSuccess: (job) => {
      setUploadedJob(job)
      setTrackedJobStatus(job.status)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setUploadProgress(null)
      toast.success(`Đã tiếp nhận tệp sửa (Job #${job.ingestion_job_id}).`)
      void queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] })
    },
    onError: (error) => {
      setUploadProgress(null)
      if (getApiErrorCode(error) === 'RESOLUTION_PARSER_REQUIRED') {
        setOverrideParser(true)
      }
    },
  })

  const resolutionMutation = useMutation({
    mutationFn: ({ jobId, note }: { jobId: number; note: string }) =>
      API_SubmitQualityResolution(issue.issue_id, {
        ingestion_job_id: jobId,
        note,
      }),
    onSuccess: async (updated) => {
      setConfirmOpen(false)
      setUploadedJob(null)
      setTrackedJobStatus(null)
      setSelectedFile(null)
      setResolutionNote('')
      queryClient.setQueryData(['quality-issue', issue.issue_id], updated)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['quality-issue', issue.issue_id] }),
        queryClient.invalidateQueries({ queryKey: ['quality-issues'] }),
      ])
      toast.success('Đã gửi báo cáo hoàn tất sửa lỗi. Yêu cầu đang chờ xác minh.')
    },
    onError: () => {
      setConfirmOpen(false)
    },
  })

  // Theo dõi trạng thái mới nhất từ cache nếu ReplacementJobStatus đã poll xong
  const cachedJob = uploadedJob
    ? queryClient.getQueryData<IngestionJob>(['ingestion-jobs', uploadedJob.ingestion_job_id])
    : undefined
  const effectiveStatus = (
    cachedJob?.status ??
    trackedJobStatus ??
    uploadedJob?.status ??
    ''
  ).toUpperCase()
  const isUploadedJobSuccess =
    uploadedJob !== null &&
    effectiveStatus === 'SUCCESS' &&
    uploadedJob.ingestion_job_id !== issue.resolution_job_id

  if (issue.status === 'PENDING_VERIFICATION') {
    return (
      <Card title="Trạng thái xử lý">
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900"
        >
          <Clock className="mt-0.5 size-4 shrink-0 text-sky-600" aria-hidden="true" />
          <div>
            <p className="font-semibold">Đang chờ quản trị dữ liệu xác minh</p>
            <p className="mt-0.5 text-sky-800">
              {issue.resolution_job_id
                ? `Bạn đã nộp bằng chứng sửa lỗi (Job #${issue.resolution_job_id}). `
                : ''}
              Không thể tải thêm bản sửa mới cho tới khi quản trị dữ liệu hoàn tất xác minh hoặc yêu
              cầu chỉnh sửa lại.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  if (issue.status === 'VERIFIED') {
    return (
      <Card title="Trạng thái xử lý">
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <div>
            <p className="font-semibold">Yêu cầu đã được xác minh hoàn tất</p>
            <p className="mt-0.5 text-emerald-800">
              Dữ liệu đã được quản trị dữ liệu kiểm tra và xác nhận đạt yêu cầu.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  if (!isEligible) {
    return (
      <Card title="Quyền xử lý yêu cầu">
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden="true" />
          <div>
            <p className="font-semibold text-slate-900">Chế độ chỉ xem</p>
            <p className="mt-0.5">
              {!context.can_resolve_issues
                ? context.note
                : 'Chỉ người phụ trách đang được phân công của yêu cầu này mới có quyền tải tệp sửa và gửi báo cáo hoàn tất.'}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const fileForParser = selectedFile?.name ?? expectedFilename ?? ''
  const useCsvFields = isCsvFilename(fileForParser)
  const useExcelFields = isExcelFilename(fileForParser)

  function validateFile(file: File | null): string | null {
    if (!file) {
      return 'Vui lòng chọn tệp đã sửa để tải lên.'
    }
    const ext = getFileExtension(file.name)
    const allowed = context.accepted_extensions.map((item) => item.toLowerCase())
    if (!allowed.includes(ext)) {
      return `Định dạng tệp "${ext || 'không rõ'}" không được hỗ trợ.`
    }
    if (expectedFilename && file.name !== expectedFilename) {
      return `Tên tệp phải giữ nguyên tên tệp nguồn gốc "${expectedFilename}" (bạn đã chọn "${file.name}").`
    }
    if (file.size === 0) {
      return 'Tệp đã chọn không có nội dung (0 byte).'
    }
    if (file.size > context.max_file_bytes) {
      return `Dung lượng tệp vượt quá giới hạn ${formatBytes(context.max_file_bytes)}.`
    }
    return null
  }

  function buildParserOverride(): { options?: Record<string, unknown>; error?: string } {
    if (!overrideParser) {
      return {}
    }
    const parsedSkip = Number(skipRows)
    if (!Number.isInteger(parsedSkip) || parsedSkip < 0) {
      return { error: 'Số dòng bỏ qua (skip_rows) phải là số nguyên lớn hơn hoặc bằng 0.' }
    }

    if (useCsvFields) {
      if (csvDelimiter.length !== 1 || csvQuoteChar.length !== 1 || csvQuoteChar === csvDelimiter) {
        return { error: 'Cấu hình dấu phân cách hoặc ký tự trích dẫn CSV chưa hợp lệ.' }
      }
      return {
        options: {
          encoding: csvEncoding,
          delimiter: csvDelimiter,
          quote_char: csvQuoteChar,
          skip_rows: parsedSkip,
        },
      }
    }

    if (useExcelFields) {
      const parsedHeaderRow = Number(excelHeaderRow)
      if (!Number.isInteger(parsedHeaderRow) || parsedHeaderRow < 1) {
        return { error: 'Dòng tiêu đề Excel (header_row) phải lớn hơn hoặc bằng 1.' }
      }
      const opts: Record<string, unknown> = {
        header_row: parsedHeaderRow,
        skip_rows: parsedSkip,
      }
      if (excelSheetName.trim()) {
        opts.sheet_name = excelSheetName.trim()
      }
      return { options: opts }
    }

    return {}
  }

  function handleUploadSubmit(event: FormEvent) {
    event.preventDefault()
    if (uploadMutation.isPending) return
    setUploadValidationError(null)
    uploadMutation.reset()

    const fileErr = validateFile(selectedFile)
    if (fileErr) {
      setUploadValidationError(fileErr)
      return
    }
    const { options: parserOptions, error: parserErr } = buildParserOverride()
    if (parserErr) {
      setUploadValidationError(parserErr)
      return
    }
    setUploadProgress(0)
    uploadMutation.mutate({
      file: selectedFile!,
      parserOptions,
    })
  }

  function handleOpenConfirm(event: FormEvent) {
    event.preventDefault()
    setResolutionError(null)
    if (!isUploadedJobSuccess || !uploadedJob) {
      setResolutionError(
        'Vui lòng tải lên bản sửa và chờ lần nạp hoàn tất lưu vào Bronze (SUCCESS) trước khi gửi báo cáo.'
      )
      return
    }
    if (!resolutionNote.trim()) {
      setResolutionError('Vui lòng nhập ghi chú mô tả nội dung đã sửa.')
      return
    }
    setConfirmOpen(true)
  }

  return (
    <div className="space-y-4">
      {latestRejectionEvent && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="font-semibold">
              Lần nộp trước đã bị từ chối xác minh — cần tải lên bản sửa mới
            </p>
            <p className="text-amber-800">
              {formatEventDetails(latestRejectionEvent.details) ??
                'Vui lòng kiểm tra lịch sử xử lý bên dưới, sửa lại tệp và tải lên một bản mới (không dùng lại job đã bị từ chối).'}
            </p>
          </div>
        </div>
      )}

      {/* Bước 1: Tải lên tệp đã sửa */}
      <Card
        title="Bước 1. Tải lên tệp đã sửa"
        subtitle="Tệp sửa lỗi bắt buộc giữ nguyên tên tệp nguồn gốc để hệ thống đối chiếu"
      >
        <form className="space-y-4 text-xs" onSubmit={handleUploadSubmit} noValidate>
          <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
            <div>
              <span className="text-slate-500">Tên tệp nguồn yêu cầu:</span>
              <p className="mt-0.5 font-mono font-semibold text-slate-900">
                {expectedFilename ?? 'Theo tệp nguồn của yêu cầu'}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Định dạng yêu cầu:</span>
              <p className="mt-0.5 font-mono font-semibold text-slate-900">
                {expectedFormat ?? context.accepted_extensions.join(', ')}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="resolution-file-input" className="block font-semibold text-slate-700">
              Chọn tệp đã sửa *
            </label>
            <input
              ref={fileInputRef}
              id="resolution-file-input"
              type="file"
              accept={expectedExt ?? context.accepted_extensions.join(',')}
              disabled={uploadMutation.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                setSelectedFile(file)
                setUploadValidationError(file ? validateFile(file) : null)
                setUploadProgress(null)
                uploadMutation.reset()
              }}
              className="block w-full cursor-pointer rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-700"
            />
            {expectedFilename && (
              <p className="text-[11px] text-slate-500">
                Lưu ý: Tên tệp tải lên phải trùng khớp hoàn toàn với{' '}
                <code className="font-mono font-semibold text-slate-800">{expectedFilename}</code>.
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <label className="flex cursor-pointer items-center gap-2 font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={overrideParser}
                onChange={(e) => setOverrideParser(e.target.checked)}
                className="size-4 accent-indigo-600"
              />
              Ghi đè cấu hình đọc tệp (bỏ chọn để giữ nguyên cấu hình của tệp nguồn gốc)
            </label>

            {overrideParser && useCsvFields && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="res-csv-encoding" className="block font-medium text-slate-700">
                    Bảng mã (Encoding)
                  </label>
                  <select
                    id="res-csv-encoding"
                    value={csvEncoding}
                    onChange={(e) => setCsvEncoding(e.target.value)}
                    className={inputClass}
                  >
                    {CSV_ENCODING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="res-csv-delimiter" className="block font-medium text-slate-700">
                    Dấu phân cách (Delimiter)
                  </label>
                  <select
                    id="res-csv-delimiter"
                    value={csvDelimiter}
                    onChange={(e) => setCsvDelimiter(e.target.value)}
                    className={inputClass}
                  >
                    {CSV_DELIMITER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="res-csv-quote" className="block font-medium text-slate-700">
                    Ký tự trích dẫn
                  </label>
                  <select
                    id="res-csv-quote"
                    value={csvQuoteChar}
                    onChange={(e) => setCsvQuoteChar(e.target.value)}
                    className={inputClass}
                  >
                    {CSV_QUOTE_CHAR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="res-csv-skip" className="block font-medium text-slate-700">
                    Số dòng bỏ qua
                  </label>
                  <input
                    id="res-csv-skip"
                    type="number"
                    min={0}
                    value={skipRows}
                    onChange={(e) => setSkipRows(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {overrideParser && useExcelFields && (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="res-excel-sheet" className="block font-medium text-slate-700">
                    Tên sheet (tùy chọn)
                  </label>
                  <input
                    id="res-excel-sheet"
                    type="text"
                    value={excelSheetName}
                    onChange={(e) => setExcelSheetName(e.target.value)}
                    placeholder="Mặc định sheet đầu tiên"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="res-excel-header" className="block font-medium text-slate-700">
                    Dòng tiêu đề
                  </label>
                  <input
                    id="res-excel-header"
                    type="number"
                    min={1}
                    value={excelHeaderRow}
                    onChange={(e) => setExcelHeaderRow(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="res-excel-skip" className="block font-medium text-slate-700">
                    Số dòng bỏ qua
                  </label>
                  <input
                    id="res-excel-skip"
                    type="number"
                    min={0}
                    value={skipRows}
                    onChange={(e) => setSkipRows(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>

          {(uploadValidationError || uploadMutation.isError) && (
            <div
              role="alert"
              className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700"
            >
              {uploadValidationError ??
                getApiErrorMessage(
                  uploadMutation.error,
                  'Không thể tải lên tệp sửa. Vui lòng kiểm tra lại và thử lại.'
                )}
            </div>
          )}

          {uploadMutation.isPending && (
            <div className="space-y-1.5" role="status">
              <div className="flex justify-between font-medium text-slate-700">
                <span>Đang tải tệp đã sửa…</span>
                <span className="font-mono">{uploadProgress ?? 0}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-indigo-600 transition-all"
                  style={{ width: `${uploadProgress ?? 0}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="outline"
              disabled={uploadMutation.isPending}
              icon={
                uploadMutation.isPending ? (
                  <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="size-3.5" aria-hidden="true" />
                )
              }
            >
              {uploadMutation.isPending ? 'Đang tải tệp sửa…' : 'Tải lên tệp đã sửa'}
            </Button>
          </div>
        </form>

        {uploadedJob && (
          <div className="mt-4">
            <ReplacementJobStatus
              jobId={uploadedJob.ingestion_job_id}
              initialJob={uploadedJob}
              onJobUpdated={(job) => setTrackedJobStatus(job.status)}
            />
          </div>
        )}
      </Card>

      {/* Bước 2: Báo đã sửa */}
      <Card
        title="Bước 2. Gửi báo cáo đã sửa để xác minh"
        subtitle="Chỉ khả dụng sau khi tệp sửa mới ở Bước 1 đã lưu thành công vào Bronze"
      >
        <form className="space-y-4 text-xs" onSubmit={handleOpenConfirm} noValidate>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
            <span className="text-slate-500">Lần nạp sửa lỗi sẽ nộp: </span>
            {isUploadedJobSuccess && uploadedJob ? (
              <span className="font-mono font-semibold text-emerald-700">
                Job #{uploadedJob.ingestion_job_id} (Đã lưu Bronze thành công)
              </span>
            ) : (
              <span className="text-slate-600">
                Chưa có lần nạp mới thành công (vui lòng hoàn tất Bước 1)
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="resolution-note" className="block font-semibold text-slate-700">
              Ghi chú nội dung đã khắc phục *
            </label>
            <textarea
              id="resolution-note"
              rows={3}
              maxLength={4000}
              disabled={!isUploadedJobSuccess || resolutionMutation.isPending}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Ví dụ: Đã cập nhật và tải lại dữ liệu cần sửa."
              className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          {(resolutionError || resolutionMutation.isError) && (
            <div
              role="alert"
              className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700"
            >
              {resolutionError ??
                getApiErrorMessage(
                  resolutionMutation.error,
                  'Không thể gửi báo cáo đã sửa. Vui lòng kiểm tra lại.'
                )}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={!isUploadedJobSuccess || resolutionMutation.isPending}
              icon={<Send className="size-3.5" aria-hidden="true" />}
            >
              Gửi báo cáo đã sửa
            </Button>
          </div>
        </form>
      </Card>

      {/* Hộp thoại xác nhận nộp */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận gửi báo cáo đã sửa</DialogTitle>
            <DialogDescription>
              Bạn xác nhận nộp lần nạp{' '}
              <strong className="font-mono text-slate-900">#{uploadedJob?.ingestion_job_id}</strong>{' '}
              làm bằng chứng khắc phục cho yêu cầu này? Sau khi gửi, yêu cầu sẽ chuyển sang trạng
              thái Chờ xác minh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={resolutionMutation.isPending}
              onClick={() => setConfirmOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              disabled={resolutionMutation.isPending}
              onClick={() => {
                if (!uploadedJob) return
                resolutionMutation.mutate({
                  jobId: uploadedJob.ingestion_job_id,
                  note: resolutionNote.trim(),
                })
              }}
            >
              {resolutionMutation.isPending ? 'Đang gửi…' : 'Xác nhận nộp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function IssueDetailContent({ context, issueId }: { context: StaffContext; issueId: string }) {
  const issueQuery = useQuery({
    queryKey: ['quality-issue', issueId],
    queryFn: () => API_GetQualityIssue(issueId),
  })

  const issue = issueQuery.data

  const datasetQuery = useQuery({
    queryKey: ['datasets', issue?.dataset_id],
    queryFn: () => API_GetDataset(issue!.dataset_id),
    enabled: Boolean(issue?.dataset_id),
    retry: false,
  })

  if (issueQuery.isPending) {
    return <LoadingState label="Đang tải chi tiết yêu cầu xử lý…" />
  }

  if (issueQuery.isError || !issue) {
    return (
      <div className="space-y-4">
        <Link
          href="/analyst/quality-issues"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Quay lại danh sách yêu cầu
        </Link>
        <ErrorState
          message={getApiErrorMessage(
            issueQuery.error,
            'Không thể tải chi tiết yêu cầu xử lý dữ liệu lỗi.'
          )}
          onRetry={() => void issueQuery.refetch()}
        />
      </div>
    )
  }

  const departmentName =
    context.departments.find((d) => d.department_id === issue.department_id)?.department_name ??
    `Đơn vị #${issue.department_id}`
  const datasetName = datasetQuery.data?.dataset_name ?? `Bộ dữ liệu #${issue.dataset_id}`
  const sourceFilename = issue.quarantine_records.find((r) => r.source_table)?.source_table ?? '—'
  const entityName = issue.quarantine_records.find((r) => r.entity)?.entity ?? '—'

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Không gian nhân viên', 'Yêu cầu dữ liệu lỗi', issue.title]}
        title={issue.title}
        description={issue.description}
        actions={
          <div className="flex items-center gap-2">
            <Tag tone={statusTone(issue.status)}>{statusLabel(issue.status)}</Tag>
            <Link
              href="/analyst/quality-issues"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Danh sách yêu cầu
            </Link>
          </div>
        }
      />

      {/* Thông tin tổng hợp */}
      <Card title="Thông tin yêu cầu và tệp nguồn">
        <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-slate-500">Bộ dữ liệu</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">{datasetName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Tệp nguồn cần sửa</dt>
            <dd className="mt-0.5 font-mono font-semibold text-slate-900">{sourceFilename}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Loại dữ liệu (Entity)</dt>
            <dd className="mt-0.5 font-mono text-slate-900">{entityName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Lĩnh vực · Đơn vị</dt>
            <dd className="mt-0.5 text-slate-900">
              {domainLabel(issue.domain, context.domains)} · {departmentName}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Người phụ trách</dt>
            <dd className="mt-0.5 font-mono text-slate-900">
              {issue.assignee_user_id === context.user_id
                ? `Tôi (#${issue.assignee_user_id})`
                : issue.assignee_user_id != null
                  ? `#${issue.assignee_user_id}`
                  : 'Chưa phân công'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Job sửa gần nhất</dt>
            <dd className="mt-0.5 font-mono text-slate-900">
              {issue.resolution_job_id != null ? `#${issue.resolution_job_id}` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Ngày tạo</dt>
            <dd className="mt-0.5 text-slate-900">{formatDateTime(issue.created_at)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Cập nhật gần nhất</dt>
            <dd className="mt-0.5 text-slate-900">{formatDateTime(issue.updated_at)}</dd>
          </div>
        </dl>
      </Card>

      {/* Quy trình tải tệp đã sửa & nộp */}
      <ResolutionWorkflow context={context} issue={issue} />

      {/* Danh sách hồ sơ lỗi liên quan */}
      <Card
        title="Hồ sơ dữ liệu lỗi liên quan (Quarantine)"
        subtitle={`${formatNumber(issue.quarantine_records.length)} bản ghi được gắn vào yêu cầu`}
        bodyClassName="p-0"
      >
        {issue.quarantine_records.length === 0 ? (
          <EmptyState title="Không có hồ sơ lỗi đính kèm" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  {[
                    'Vị trí dòng nguồn',
                    'Locator',
                    'Tệp nguồn',
                    'Mã lỗi',
                    'Chi tiết kiểm tra',
                    'Phiên bản Bronze',
                  ].map((heading) => (
                    <th key={heading} scope="col" className="px-3 py-2 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issue.quarantine_records.map((rec) => (
                  <tr key={rec.record_id}>
                    <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">
                      Dòng {formatNumber(rec.record_position)}
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-2.5 font-mono text-slate-700">
                      {rec.locator}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-700">
                      {rec.source_table ?? '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {rec.error_codes.map((code) => (
                          <Tag key={code} tone="rose">
                            {code}
                          </Tag>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {rec.issues.length > 0 ? (
                        <ul className="space-y-0.5">
                          {rec.issues.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <FileWarning
                                className="mt-0.5 size-3 shrink-0 text-amber-600"
                                aria-hidden="true"
                              />
                              <span>
                                {typeof detail.message === 'string'
                                  ? detail.message
                                  : typeof detail.field === 'string'
                                    ? `${detail.field}: ${
                                        typeof detail.rule === 'string'
                                          ? detail.rule
                                          : typeof detail.code === 'string'
                                            ? detail.code
                                            : 'Chưa hợp lệ'
                                      }`
                                    : JSON.stringify(detail)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-500">{rec.bronze_version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Lịch sử xử lý (Audit History) */}
      <Card title="Lịch sử xử lý và xác minh">
        {issue.history.length === 0 ? (
          <EmptyState title="Chưa có sự kiện xử lý nào" />
        ) : (
          <ol className="space-y-3 text-xs">
            {issue.history.map((event) => {
              const detailText = formatEventDetails(event.details)
              return (
                <li
                  key={event.event_id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {eventTypeLabel(event.event_type)}
                      </span>
                      {event.from_status && (
                        <span className="text-slate-500">{statusLabel(event.from_status)} → </span>
                      )}
                      <Tag tone={statusTone(event.to_status)}>{statusLabel(event.to_status)}</Tag>
                    </div>
                    {detailText && <p className="text-slate-700">{detailText}</p>}
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    <p>{formatDateTime(event.created_at)}</p>
                    <p className="font-mono">Tác nhân #{event.actor_id}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </Card>
    </div>
  )
}

export function StaffQualityIssueDetailView({ issueId }: { issueId: string }) {
  return (
    <StaffContextGate>
      {(context) => <IssueDetailContent context={context} issueId={issueId} />}
    </StaffContextGate>
  )
}
