'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import Link from 'next/link'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  FileSpreadsheet,
  History,
  LoaderCircle,
  Search,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { getApiErrorMessage, getErrorMessageForCode } from '@/api/http'
import { API_ListDatasets } from '@/api/shared/datasets'
import { API_GetIngestionJob } from '@/api/shared/ingestion'
import { API_UploadIngestion } from '@/api/staff/upload'
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

const DATASET_PAGE_SIZE = 20

const newDatasetSchema = z.object({
  datasetName: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên bộ dữ liệu mới.')
    .max(200, 'Tên bộ dữ liệu tối đa 200 ký tự.'),
  description: z.string().max(4000, 'Mô tả tối đa 4000 ký tự.').optional(),
})

const inputClass =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 disabled:bg-slate-50 disabled:text-slate-500'

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
            <LoaderCircle
              className="mt-0.5 size-4 shrink-0 animate-spin text-amber-600"
              aria-hidden="true"
            />
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
  const singleDomain = context.default_domain ?? context.domains[0]?.domain ?? null

  const [mode, setMode] = useState<'existing' | 'new'>('existing')

  // Existing dataset search & pagination
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [datasetDomainFilter, setDatasetDomainFilter] = useState<string>('')
  const [datasetOffset, setDatasetOffset] = useState(0)
  const [selectedDataset, setSelectedDataset] = useState<DatasetItem | null>(null)

  // New dataset fields
  const [datasetName, setDatasetName] = useState('')
  const [description, setDescription] = useState('')
  const [newDomain, setNewDomain] = useState<string>(singleDomain ?? '')

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

  useEffect(() => {
    if (!hasMultipleDomains && singleDomain) {
      setNewDomain(singleDomain)
    }
  }, [hasMultipleDomains, singleDomain])

  const effectiveFilterDomain = hasMultipleDomains
    ? (datasetDomainFilter as UploadDomain | '') || undefined
    : (singleDomain as UploadDomain | null) || undefined

  const datasetsQuery = useQuery({
    queryKey: [
      'datasets',
      {
        search: appliedSearch || undefined,
        domain: effectiveFilterDomain,
        limit: DATASET_PAGE_SIZE,
        offset: datasetOffset,
      },
    ],
    queryFn: () =>
      API_ListDatasets({
        search: appliedSearch || undefined,
        domain: effectiveFilterDomain,
        limit: DATASET_PAGE_SIZE,
        offset: datasetOffset,
      }),
    enabled: mode === 'existing',
  })

  const uploadMutation = useMutation({
    mutationFn: API_UploadIngestion,
    onSuccess: (job, variables) => {
      setSubmittedJob(job)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setCustomizeParser(false)
      setUploadProgress(null)
      if (variables.mode === 'new') {
        setDatasetName('')
        setDescription('')
      }
      toast.success(`Đã tiếp nhận tệp vào hàng đợi nạp dữ liệu (Job #${job.ingestion_job_id}).`)
      void queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] })
      void queryClient.invalidateQueries({ queryKey: ['datasets'] })
    },
    onError: () => {
      setUploadProgress(null)
    },
  })

  if (!context.can_upload) {
    return <StaffAccessDeniedState />
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

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault()
    setDatasetOffset(0)
    setAppliedSearch(searchInput.trim())
  }

  function handleUploadSubmit(event: FormEvent) {
    event.preventDefault()
    if (uploadMutation.isPending) return

    setValidationError(null)
    uploadMutation.reset()

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

    if (mode === 'existing') {
      if (!selectedDataset) {
        setValidationError('Vui lòng chọn một bộ dữ liệu từ danh sách trước khi tải lên.')
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
      return
    }

    const parsedNew = newDatasetSchema.safeParse({
      datasetName,
      description: description || undefined,
    })
    if (!parsedNew.success) {
      setValidationError(
        parsedNew.error.issues[0]?.message ?? 'Thông tin bộ dữ liệu mới chưa hợp lệ.'
      )
      return
    }

    if (hasMultipleDomains && !newDomain) {
      setValidationError('Vui lòng chọn lĩnh vực cho bộ dữ liệu mới.')
      return
    }

    setUploadProgress(0)
    uploadMutation.mutate({
      mode: 'new',
      file,
      datasetName: parsedNew.data.datasetName,
      description: parsedNew.data.description,
      domain: hasMultipleDomains ? (newDomain as UploadDomain) : undefined,
      parserOptions,
      onUploadProgress: (percent) => setUploadProgress(percent),
    })
  }

  const datasets = datasetsQuery.data ?? []
  const selectedTargetName =
    mode === 'existing'
      ? (selectedDataset?.dataset_name ?? 'Chưa chọn bộ dữ liệu')
      : datasetName.trim() || 'Chưa nhập tên bộ dữ liệu mới'

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Không gian nhân viên', 'Nạp dữ liệu']}
        title="Nạp dữ liệu vào tầng Bronze"
        description={`Tải tệp ${context.accepted_extensions.join(', ')} (tối đa ${formatBytes(context.max_file_bytes)}, ${formatNumber(context.max_records)} dòng) vào bộ dữ liệu đã có hoặc tạo bộ dữ liệu mới.`}
        actions={
          <Link
            href="/staff/ingestion"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <History className="size-3.5" aria-hidden="true" />
            Lịch sử nạp dữ liệu
          </Link>
        }
      />

      {submittedJob && (
        <JobTrackerCard jobId={submittedJob.ingestion_job_id} initialJob={submittedJob} />
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {/* Chọn chế độ nạp */}
          <Card title="1. Chọn đích lưu dữ liệu">
            <div
              className="mb-4 flex flex-wrap gap-2"
              role="tablist"
              aria-label="Chế độ nạp dữ liệu"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'existing'}
                onClick={() => {
                  setMode('existing')
                  setValidationError(null)
                }}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mode === 'existing'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Nạp vào bộ dữ liệu đã có
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'new'}
                onClick={() => {
                  setMode('new')
                  setValidationError(null)
                }}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mode === 'new'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Tạo bộ dữ liệu mới và nạp
              </button>
            </div>

            {mode === 'existing' ? (
              <div className="space-y-3">
                <form className="flex flex-wrap gap-2" onSubmit={handleSearchSubmit}>
                  <div className="relative min-w-[200px] flex-1">
                    <label htmlFor="dataset-search" className="sr-only">
                      Tìm kiếm bộ dữ liệu theo tên
                    </label>
                    <Search
                      className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="dataset-search"
                      type="search"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Tìm bộ dữ liệu theo tên…"
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                  {hasMultipleDomains && (
                    <div>
                      <label htmlFor="dataset-domain-filter" className="sr-only">
                        Lọc theo lĩnh vực
                      </label>
                      <select
                        id="dataset-domain-filter"
                        aria-label="Lọc bộ dữ liệu theo lĩnh vực"
                        className={inputClass}
                        value={datasetDomainFilter}
                        onChange={(e) => {
                          setDatasetDomainFilter(e.target.value)
                          setDatasetOffset(0)
                        }}
                      >
                        <option value="">Tất cả lĩnh vực được cấp</option>
                        {context.domains.map((d) => (
                          <option key={d.domain} value={d.domain}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <Button type="submit" variant="outline" className="h-9">
                    Tìm kiếm
                  </Button>
                </form>

                {datasetsQuery.isPending ? (
                  <LoadingState label="Đang tải danh sách bộ dữ liệu…" />
                ) : datasetsQuery.isError ? (
                  <ErrorState
                    message={getApiErrorMessage(
                      datasetsQuery.error,
                      'Không tải được danh sách bộ dữ liệu.'
                    )}
                    onRetry={() => void datasetsQuery.refetch()}
                  />
                ) : datasets.length === 0 ? (
                  <EmptyState
                    title="Không tìm thấy bộ dữ liệu phù hợp"
                    description="Bạn có thể thử từ khóa khác hoặc chuyển sang tab Tạo bộ dữ liệu mới."
                  />
                ) : (
                  <>
                    <div className="divide-y divide-slate-200 rounded-md border border-slate-200">
                      {datasets.map((ds) => {
                        const isSelected = selectedDataset?.dataset_id === ds.dataset_id
                        return (
                          <label
                            key={ds.dataset_id}
                            className={`flex cursor-pointer items-start gap-3 p-3 text-xs transition-colors ${
                              isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="selected-dataset"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedDataset(ds)
                                setValidationError(null)
                              }}
                              className="mt-0.5 size-4 accent-indigo-600"
                            />
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-slate-900">
                                  {ds.dataset_name}
                                </span>
                                <Tag tone="indigo">{domainLabel(ds.domain, context.domains)}</Tag>
                                <Tag tone={statusTone(ds.status)}>{statusLabel(ds.status)}</Tag>
                              </div>
                              {ds.description && (
                                <p className="line-clamp-2 text-slate-500">{ds.description}</p>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                      <span>
                        Hiển thị {datasets.length} bộ dữ liệu (vị trí {datasetOffset + 1}–
                        {datasetOffset + datasets.length})
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          disabled={datasetOffset === 0 || datasetsQuery.isFetching}
                          onClick={() =>
                            setDatasetOffset((prev) => Math.max(0, prev - DATASET_PAGE_SIZE))
                          }
                          icon={<ChevronLeft className="size-3.5" aria-hidden="true" />}
                        >
                          Trước
                        </Button>
                        <Button
                          disabled={datasets.length < DATASET_PAGE_SIZE || datasetsQuery.isFetching}
                          onClick={() => setDatasetOffset((prev) => prev + DATASET_PAGE_SIZE)}
                          icon={<ChevronRight className="size-3.5" aria-hidden="true" />}
                        >
                          Sau
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="new-dataset-name"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Tên bộ dữ liệu mới *
                  </label>
                  <input
                    id="new-dataset-name"
                    type="text"
                    maxLength={200}
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    placeholder="Ví dụ: Danh sách nhân sự học kỳ 1"
                    className={inputClass}
                  />
                </div>

                {hasMultipleDomains ? (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="new-dataset-domain"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Lĩnh vực *
                    </label>
                    <select
                      id="new-dataset-domain"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Chọn lĩnh vực được cấp quyền</option>
                      {context.domains.map((item) => (
                        <option key={item.domain} value={item.domain}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span>Lĩnh vực áp dụng tự động:</span>
                    <Tag tone="indigo">{domainLabel(singleDomain ?? '', context.domains)}</Tag>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="new-dataset-description"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Mô tả bộ dữ liệu (tùy chọn)
                  </label>
                  <textarea
                    id="new-dataset-description"
                    rows={3}
                    maxLength={4000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả ngắn gọn về nguồn gốc và phạm vi dữ liệu…"
                    className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Chọn tệp và tùy chọn đọc tệp */}
          <Card title="2. Chọn tệp và cấu hình đọc tệp">
            <form
              id="staff-upload-form"
              className="space-y-4"
              onSubmit={handleUploadSubmit}
              noValidate
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="upload-file-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Tệp dữ liệu ({context.accepted_extensions.join(', ')}) *
                  </label>
                  {selectedFile && !uploadMutation.isPending && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null)
                        setValidationError(null)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                      className="text-xs font-medium text-slate-500 hover:text-rose-600"
                    >
                      Bỏ chọn tệp
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  id="upload-file-input"
                  type="file"
                  accept={context.accepted_extensions.join(',')}
                  disabled={uploadMutation.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null
                    setSelectedFile(file)
                    setValidationError(file ? validateFile(file) : null)
                    setUploadProgress(null)
                    uploadMutation.reset()
                  }}
                  className="block w-full cursor-pointer rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-700"
                />
                <p className="text-[11px] text-slate-500">
                  Tên tệp chỉ dùng chữ cái không dấu, số, dấu gạch ngang, gạch dưới và dấu chấm. Tệp
                  phải có dòng tiêu đề.
                </p>
              </div>

              {selectedFile && (
                <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={customizeParser}
                      onChange={(e) => setCustomizeParser(e.target.checked)}
                      className="size-4 accent-indigo-600"
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

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={uploadMutation.isPending}
                  icon={
                    uploadMutation.isPending ? (
                      <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Upload className="size-3.5" aria-hidden="true" />
                    )
                  }
                >
                  {uploadMutation.isPending ? 'Đang tải lên…' : 'Tải lên và nạp dữ liệu'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Tóm tắt thông tin tệp trước khi gửi */}
        <div className="space-y-4">
          <Card title="Tóm tắt yêu cầu tải lên">
            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-slate-500">Hình thức</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {mode === 'existing' ? 'Nạp vào bộ dữ liệu đã có' : 'Tạo bộ dữ liệu mới'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Bộ dữ liệu đích</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{selectedTargetName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Tên tệp</dt>
                <dd className="mt-0.5 break-all font-mono text-slate-900">
                  {selectedFile ? selectedFile.name : 'Chưa chọn tệp'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Dung lượng</dt>
                <dd className="mt-0.5 font-mono text-slate-900">
                  {selectedFile ? formatBytes(selectedFile.size) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Định dạng</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-mono text-slate-900">
                  {selectedFile ? (
                    <>
                      <FileSpreadsheet className="size-3.5 text-indigo-600" aria-hidden="true" />
                      {isCsv ? 'CSV' : isExcel ? 'EXCEL' : getFileExtension(selectedFile.name)}
                    </>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Tùy chọn đọc tệp</dt>
                <dd className="mt-0.5 text-slate-700">
                  {!selectedFile
                    ? '—'
                    : !customizeParser
                      ? 'Mặc định theo hệ thống'
                      : isCsv
                        ? `${csvEncoding}, dấu phân cách "${csvDelimiter === '\t' ? '\\t' : csvDelimiter}", bỏ qua ${skipRows} dòng`
                        : `Sheet: ${excelSheetName.trim() || 'Đầu tiên'}, dòng tiêu đề ${excelHeaderRow}, bỏ qua ${skipRows} dòng`}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function StaffUploadView() {
  return <StaffContextGate>{(context) => <UploadContent context={context} />}</StaffContextGate>
}
