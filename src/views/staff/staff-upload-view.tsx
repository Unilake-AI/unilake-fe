'use client'

import { useRef, useState } from 'react'
import type { FormEvent } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, CircleAlert, Clock, FileUp, History, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

import { getApiErrorMessage, getErrorMessageForCode } from '@/api/http'
import { API_ListDatasets } from '@/api/shared/datasets'
import { API_GetIngestionJob } from '@/api/shared/ingestion'
import { API_UploadIngestion } from '@/api/staff/upload'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Tag,
  formatDateTime,
  formatNumber,
  statusLabel,
  statusTone,
} from '@/components/page/page-parts'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ASK_AI_PATHS } from '@/config/menu'
import type { DatasetItem } from '@/types/datasets'
import type { IngestionJob } from '@/types/ingestion'
import type { StaffContext } from '@/types/staff-context'
import type { UploadDomain } from '@/types/staff-upload'

import { StaffAccessDeniedState, StaffContextGate } from './staff-context-gate'
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
  isValidUploadFilename,
} from './staff-helpers'

const DATASET_PAGE_SIZE = 100
const uploadDialogTiming =
  'data-[state=open]:duration-300 data-[state=closed]:duration-75 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none'

const inputClass =
  'h-10 w-full rounded-lg border border-[#cbd4e3] bg-white px-3 text-sm text-[#17233d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6761ed]/30 disabled:bg-slate-50 disabled:text-slate-500'

function JobTrackerCard({ jobId, initialJob }: { jobId: number; initialJob: IngestionJob }) {
  const query = useQuery({
    queryKey: ['ingestion-jobs', jobId],
    queryFn: () => API_GetIngestionJob(jobId),
    initialData: initialJob,
    refetchInterval: (q) =>
      q.state.data && isIngestionJobActive(q.state.data.status)
        ? INGESTION_POLL_INTERVAL_MS
        : false,
  })

  const job = query.data ?? initialJob
  const status = (job?.status ?? initialJob.status ?? 'QUEUED').toUpperCase()
  const active = isIngestionJobActive(status)
  const validationDetails = extractSafeValidationDetails(job.validation_report)

  return (
    <Card
      title={`Theo dõi lần nạp #${job.ingestion_job_id}`}
      subtitle={`Tệp: ${job.source_table ?? '—'} · Bộ dữ liệu #${job.dataset_id}`}
      right={<Tag tone={statusTone(status)}>{statusLabel(status)}</Tag>}
    >
      <div className="space-y-3 text-xs">
        {status === 'QUEUED' && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900"
          >
            <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
            <div>
              <p className="font-semibold">
                Đã tiếp nhận yêu cầu (Job #{job.ingestion_job_id}) — Đang chờ xử lý (QUEUED)
              </p>
              <p className="mt-0.5 text-amber-800">
                Hệ thống đã ghi nhận tệp vào hàng đợi kiểm tra. Dữ liệu chưa được lưu vào Bronze ở
                bước này.
              </p>
            </div>
          </div>
        )}

        {status === 'RUNNING' && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900"
          >
            <Skeleton className="mt-1 size-3 shrink-0 bg-amber-200" aria-hidden="true" />
            <div>
              <p className="font-semibold">Đang xử lý tệp dữ liệu (RUNNING)</p>
              <p className="mt-0.5 text-amber-800">
                Worker đang kiểm tra cấu trúc và lưu dữ liệu gốc vào tầng Bronze…
              </p>
            </div>
          </div>
        )}

        {status === 'RETRY_WAIT' && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900"
          >
            <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
            <div>
              <p className="font-semibold">Đang chờ hệ thống tự động thử lại (RETRY_WAIT)</p>
              <p className="mt-0.5 text-amber-800">
                Lần xử lý tạm thời bị gián đoạn. Hệ thống sẽ tự động chạy lại trong giây lát.
              </p>
            </div>
          </div>
        )}

        {status === 'SUCCESS' && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900"
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <div>
              <p className="font-semibold">{BRONZE_SUCCESS_MESSAGE}</p>
              <p className="mt-0.5 text-emerald-800">
                Đã đọc {formatNumber(job.rows_read)} dòng · Đã ghi {formatNumber(job.rows_written)}{' '}
                dòng · Loại {formatNumber(job.rows_rejected)} dòng.
              </p>
            </div>
          </div>
        )}

        {(status === 'FAILED' || status === 'REJECTED') && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-900"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold">
                {status === 'REJECTED'
                  ? 'Yêu cầu nạp dữ liệu bị từ chối (REJECTED)'
                  : 'Nạp dữ liệu không thành công (FAILED)'}
              </p>
              <p className="text-rose-800">
                {getErrorMessageForCode(job.error_message) ??
                  'Tệp dữ liệu chưa đạt kiểm tra hoặc gặp lỗi khi lưu vào Bronze. Vui lòng kiểm tra lại tệp nguồn và tải lên bản mới.'}
              </p>
              {validationDetails.length > 0 && (
                <ul className="list-disc pl-4 text-rose-700">
                  {validationDetails.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
          <span>
            Giai đoạn:{' '}
            <strong className="text-slate-700">{statusLabel(job.stage ?? status)}</strong> · Tạo
            lúc: {formatDateTime(job.created_at)}
            {active && ' · Tự động cập nhật mỗi 4 giây'}
          </span>
          <Link
            href={`/staff/ingestion?jobId=${job.ingestion_job_id}`}
            className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
          >
            <History className="size-3.5" aria-hidden="true" />
            Xem trong lịch sử nạp dữ liệu
          </Link>
        </div>

        {query.isError && (
          <ErrorState
            message={getApiErrorMessage(query.error, 'Không cập nhật được trạng thái job.')}
            retrying={query.isFetching}
            onRetry={() => void query.refetch()}
          />
        )}
      </div>
    </Card>
  )
}

function UploadContent({ context }: { context: StaffContext }) {
  const queryClient = useQueryClient()
  const hasMultipleDomains = context.domains.length > 1 || context.default_domain == null
  const datasetDomain = hasMultipleDomains ? undefined : (context.default_domain as UploadDomain)
  const [selectedDatasetId, setSelectedDatasetId] = useState('')

  // File & parser options
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [customizeParser, setCustomizeParser] = useState(false)
  const [csvEncoding, setCsvEncoding] = useState('utf-8')
  const [csvDelimiter, setCsvDelimiter] = useState(',')
  const [csvQuoteChar, setCsvQuoteChar] = useState('"')
  const [excelSheetName, setExcelSheetName] = useState('')
  const [excelHeaderRow, setExcelHeaderRow] = useState('1')
  const [skipRows, setSkipRows] = useState('0')

  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [submittedJob, setSubmittedJob] = useState<IngestionJob | null>(null)

  const datasetsQuery = useQuery({
    queryKey: ['datasets', 'staff-upload', datasetDomain],
    enabled: context.can_upload,
    queryFn: async () => {
      const datasets: DatasetItem[] = []
      for (let offset = 0; ; offset += DATASET_PAGE_SIZE) {
        const page = await API_ListDatasets({
          domain: datasetDomain,
          limit: DATASET_PAGE_SIZE,
          offset,
        })
        datasets.push(...page)
        if (page.length < DATASET_PAGE_SIZE) return datasets
      }
    },
  })

  const uploadMutation = useMutation({
    mutationFn: API_UploadIngestion,
    onSuccess: (job) => {
      setSubmittedJob(job)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setCustomizeParser(false)
      setUploadProgress(null)
      toast.success(`Đã tiếp nhận tệp vào hàng đợi nạp dữ liệu (Job #${job.ingestion_job_id}).`)
      void queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] })
      void queryClient.invalidateQueries({ queryKey: ['datasets'] })
    },
    onError: () => {
      setUploadProgress(null)
    },
  })

  if (!context.can_upload) {
    return context.departments.length === 0 ? (
      <EmptyState
        title="Chưa có phân công phòng ban"
        description="Cần phân công phòng ban đang hiệu lực để nạp dữ liệu Bronze."
      />
    ) : (
      <StaffAccessDeniedState />
    )
  }

  const isCsv = selectedFile ? isCsvFilename(selectedFile.name) : false
  const isExcel = selectedFile ? isExcelFilename(selectedFile.name) : false

  function validateFile(file: File | null): string | null {
    if (!file) {
      return 'Vui lòng chọn tệp dữ liệu (.csv, .xlsx hoặc .xlsm) để tải lên.'
    }
    const ext = getFileExtension(file.name)
    const allowed = context.accepted_extensions.map((item) => item.toLowerCase())
    if (!allowed.includes(ext)) {
      return `Định dạng tệp "${ext || 'không rõ'}" không được hỗ trợ. Chỉ chấp nhận: ${context.accepted_extensions.join(', ')}.`
    }
    if (!isValidUploadFilename(file.name)) {
      return 'Tên tệp chỉ được chứa chữ cái không dấu, số, dấu gạch ngang (-), gạch dưới (_) và dấu chấm (.), tối đa 200 ký tự.'
    }
    if (file.size === 0) {
      return 'Tệp đã chọn không có nội dung (0 byte).'
    }
    if (file.size > context.max_file_bytes) {
      return `Dung lượng tệp (${formatBytes(file.size)}) vượt quá giới hạn tối đa ${formatBytes(context.max_file_bytes)}.`
    }
    return null
  }

  function buildParserOptions(): { options?: Record<string, unknown>; error?: string } {
    if (!customizeParser || !selectedFile) {
      return {}
    }
    const parsedSkip = Number(skipRows)
    if (!Number.isInteger(parsedSkip) || parsedSkip < 0) {
      return { error: 'Số dòng bỏ qua (skip_rows) phải là số nguyên lớn hơn hoặc bằng 0.' }
    }

    if (isCsv) {
      if (!csvEncoding.trim()) {
        return { error: 'Vui lòng chọn hoặc nhập bảng mã (encoding) cho tệp CSV.' }
      }
      if (csvDelimiter.length !== 1) {
        return { error: 'Ký tự phân cách CSV phải gồm đúng 1 ký tự.' }
      }
      if (csvQuoteChar.length !== 1 || csvQuoteChar === csvDelimiter) {
        return { error: 'Ký tự trích dẫn CSV phải gồm 1 ký tự và khác ký tự phân cách.' }
      }
      return {
        options: {
          encoding: csvEncoding.trim(),
          delimiter: csvDelimiter,
          quote_char: csvQuoteChar,
          skip_rows: parsedSkip,
        },
      }
    }

    if (isExcel) {
      const parsedHeaderRow = Number(excelHeaderRow)
      if (!Number.isInteger(parsedHeaderRow) || parsedHeaderRow < 1) {
        return { error: 'Dòng tiêu đề Excel (header_row) phải lớn hơn hoặc bằng 1.' }
      }
      const options: Record<string, unknown> = {
        header_row: parsedHeaderRow,
        skip_rows: parsedSkip,
      }
      if (excelSheetName.trim()) {
        options.sheet_name = excelSheetName.trim()
      }
      return { options }
    }

    return {}
  }

  const datasets = datasetsQuery.data ?? []
  const selectedDataset = datasets.find(
    (dataset) => String(dataset.dataset_id) === selectedDatasetId
  )

  function handleUploadSubmit(event: FormEvent) {
    event.preventDefault()
    if (uploadMutation.isPending) return

    setValidationError(null)
    uploadMutation.reset()

    if (!selectedDataset) {
      setValidationError('Vui lòng chọn bộ dữ liệu tiếp nhận trước khi tải lên.')
      return
    }

    const fileErr = validateFile(selectedFile)
    if (fileErr) {
      setValidationError(fileErr)
      return
    }
    const file = selectedFile!

    const { options: parserOptions, error: parserErr } = buildParserOptions()
    if (parserErr) {
      setValidationError(parserErr)
      return
    }

    setUploadProgress(0)
    uploadMutation.mutate({
      mode: 'existing',
      file,
      datasetId: selectedDataset.dataset_id,
      parserOptions,
      onUploadProgress: (percent) => setUploadProgress(percent),
    })
  }

  return (
    <div className="space-y-4">
      <form
        aria-label="Tải tệp dữ liệu"
        className="grid grid-cols-1 gap-3"
        onSubmit={handleUploadSubmit}
        noValidate
      >
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="upload-dataset" className="block text-xs font-semibold text-slate-700">
            Bộ dữ liệu tiếp nhận *
          </label>
          <select
            id="upload-dataset"
            className={inputClass}
            disabled={datasets.length === 0 || uploadMutation.isPending}
            required
            value={selectedDataset ? selectedDatasetId : ''}
            onChange={(event) => {
              setSelectedDatasetId(event.target.value)
              setValidationError(null)
              uploadMutation.reset()
            }}
          >
            <option value="" disabled>
              {datasetsQuery.isPending
                ? 'Đang tải bộ dữ liệu…'
                : datasetsQuery.isError && datasets.length === 0
                  ? 'Không tải được bộ dữ liệu'
                  : datasets.length === 0
                    ? 'Chưa có bộ dữ liệu tiếp nhận'
                    : 'Chọn bộ dữ liệu'}
            </option>
            {datasets.map((dataset) => (
              <option key={dataset.dataset_id} value={dataset.dataset_id}>
                {hasMultipleDomains
                  ? `${dataset.dataset_name} · ${domainLabel(dataset.domain, context.domains)}`
                  : dataset.dataset_name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0 space-y-1.5">
          <p id="upload-file-label" className="text-xs font-semibold text-slate-700">
            Tệp dữ liệu *
          </p>
          <div className="flex h-10 items-center gap-2">
            <Button
              variant="outline"
              disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              aria-describedby="upload-file-label upload-file-hint"
              className="h-10 shrink-0 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              icon={<FileUp className="size-3.5" aria-hidden="true" />}
            >
              Chọn tệp
            </Button>
            <span
              aria-live="polite"
              title={selectedFile?.name}
              className="truncate text-xs text-slate-600"
            >
              {selectedFile?.name}
            </span>
            {selectedFile && !uploadMutation.isPending && (
              <Button
                variant="ghost"
                aria-label="Bỏ chọn tệp"
                title="Bỏ chọn tệp"
                onClick={() => {
                  setSelectedFile(null)
                  setValidationError(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                className="size-9 shrink-0 p-0 hover:text-rose-600"
                icon={<X className="size-4" aria-hidden="true" />}
              />
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            aria-labelledby="upload-file-label"
            accept={context.accepted_extensions.join(',')}
            disabled={uploadMutation.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              setSelectedFile(file)
              setValidationError(file ? validateFile(file) : null)
              setUploadProgress(null)
              uploadMutation.reset()
            }}
          />
        </div>

        <p id="upload-file-hint" className="text-xs text-slate-500">
          Tệp {context.accepted_extensions.join(', ')} có dòng tiêu đề, tối đa{' '}
          {formatBytes(context.max_file_bytes)} và {formatNumber(context.max_records)} dòng.
        </p>

        {datasetsQuery.isError && (
          <ErrorState
            message={getApiErrorMessage(
              datasetsQuery.error,
              'Không tải được danh sách bộ dữ liệu.'
            )}
            retrying={datasetsQuery.isFetching}
            onRetry={() => void datasetsQuery.refetch()}
          />
        )}

        {selectedFile && (
          <details className="rounded-md border bg-slate-50 px-3">
            <summary className="py-2.5 text-sm font-medium">
              Nâng cao{customizeParser ? ' · Đang dùng cấu hình tùy chỉnh' : ''}
            </summary>
            <div className="space-y-3 pb-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={customizeParser}
                  onChange={(e) => setCustomizeParser(e.target.checked)}
                  className="size-4 accent-primary"
                />
                Tùy chỉnh cấu hình đọc tệp (Parser options)
              </label>

              {customizeParser && isCsv && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label
                      htmlFor="csv-encoding"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Bảng mã (Encoding)
                    </label>
                    <select
                      id="csv-encoding"
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
                    <label
                      htmlFor="csv-delimiter"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Dấu phân cách (Delimiter)
                    </label>
                    <select
                      id="csv-delimiter"
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
                    <label
                      htmlFor="csv-quote-char"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Ký tự trích dẫn (Quote char)
                    </label>
                    <select
                      id="csv-quote-char"
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
                    <label
                      htmlFor="csv-skip-rows"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Số dòng bỏ qua (Skip rows)
                    </label>
                    <input
                      id="csv-skip-rows"
                      type="number"
                      min={0}
                      value={skipRows}
                      onChange={(e) => setSkipRows(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {customizeParser && isExcel && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="excel-sheet-name"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Tên sheet (tùy chọn)
                    </label>
                    <input
                      id="excel-sheet-name"
                      type="text"
                      maxLength={200}
                      value={excelSheetName}
                      onChange={(e) => setExcelSheetName(e.target.value)}
                      placeholder="Mặc định sheet đầu tiên"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="excel-header-row"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Dòng tiêu đề (Header row)
                    </label>
                    <input
                      id="excel-header-row"
                      type="number"
                      min={1}
                      value={excelHeaderRow}
                      onChange={(e) => setExcelHeaderRow(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="excel-skip-rows"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Số dòng bỏ qua (Skip rows)
                    </label>
                    <input
                      id="excel-skip-rows"
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
          </details>
        )}

        {(validationError || uploadMutation.isError) && (
          <div
            role="alert"
            className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
          >
            {validationError ??
              getApiErrorMessage(
                uploadMutation.error,
                'Không thể tải tệp lên. Vui lòng kiểm tra lại thông tin và thử lại.'
              )}
          </div>
        )}

        {uploadMutation.isPending && (
          <div className="space-y-1.5" role="status" aria-label="Đang tải tệp lên">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>Đang tải tệp lên máy chủ…</span>
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

        <Button
          loading={uploadMutation.isPending}
          type="submit"
          variant="primary"
          className="h-10 justify-self-end"
          icon={<Upload className="size-3.5" aria-hidden="true" />}
        >
          {uploadMutation.isPending ? 'Đang tải lên…' : 'Tải lên'}
        </Button>
      </form>
      {submittedJob && (
        <JobTrackerCard jobId={submittedJob.ingestion_job_id} initialJob={submittedJob} />
      )}
    </div>
  )
}

export function StaffUploadDialog() {
  if (usePathname() === ASK_AI_PATHS.STAFF) return null

  return (
    <Dialog>
      <div className="h-14">
        <DialogTrigger asChild>
          <Button
            variant="primary"
            className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 sm:right-6"
            icon={<Upload className="size-3.5" aria-hidden="true" />}
          >
            Nạp dữ liệu
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent
        aria-describedby={undefined}
        className={`max-w-sm ${uploadDialogTiming}`}
        overlayClassName={uploadDialogTiming}
      >
        <DialogTitle className="pr-8">Nạp dữ liệu</DialogTitle>
        <StaffContextGate showAssignmentBanner={false}>
          {(context) => <UploadContent context={context} />}
        </StaffContextGate>
      </DialogContent>
    </Dialog>
  )
}
