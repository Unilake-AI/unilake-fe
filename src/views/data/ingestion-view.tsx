'use client'

import { Fragment, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import Link from 'next/link'

import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Play,
  RefreshCw,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { API_RunCleaning } from '@/api/admindata/cleaning'
import { API_ListDatasets } from '@/api/admindata/datasets'
import { API_CreateIngestionJob, API_RetryIngestionJob } from '@/api/admindata/ingestion'
import { getApiErrorMessage, getErrorMessageForCode } from '@/api/http'
import { API_ListDataSources } from '@/api/shared/data-sources'
import {
  API_GetIngestionJob,
  API_GetIngestionMetrics,
  API_GetIngestionStats,
  API_ListIngestionAttempts,
  API_ListIngestionJobs,
} from '@/api/shared/ingestion'
import { API_UploadIngestion } from '@/api/staff/upload'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  KpiCard,
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
import type { IngestionJob, IngestionJobStatusFilter } from '@/types/ingestion'
import type { UploadDomain } from '@/types/staff-upload'
import {
  CSV_DELIMITER_OPTIONS,
  CSV_ENCODING_OPTIONS,
  CSV_QUOTE_CHAR_OPTIONS,
  getFileExtension,
  isCsvFilename,
  isExcelFilename,
  isValidUploadFilename,
} from '@/views/staff/staff-helpers'

import {
  DATA_DOMAINS,
  POLL_INTERVAL_MS,
  extractSafeValidationDetails,
  formatSeconds,
  isJobActive,
  isJobRetryEligible,
  jobTypeLabel,
} from './data-helpers'

const PAGE_SIZE = 20
const INGESTION_FAILURE = 'Không thể nạp dữ liệu. Vui lòng kiểm tra nguồn và thử lại.'

const inputClass =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91830]/30'

const JOB_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'QUEUED', label: 'QUEUED' },
  { value: 'RUNNING', label: 'RUNNING' },
  { value: 'RETRY_WAIT', label: 'RETRY_WAIT' },
  { value: 'SUCCESS', label: 'SUCCESS' },
  { value: 'FAILED', label: 'FAILED' },
  { value: 'REJECTED', label: 'REJECTED' },
] as const

export { isJobActive }

function JobDetails({
  jobId,
  datasetNameMap,
  onSelectJob,
}: {
  jobId: number
  datasetNameMap: Map<number, string>
  onSelectJob: (nextJobId: number) => void
}) {
  const queryClient = useQueryClient()
  const [profileId, setProfileId] = useState('')
  const [confirmRetryOpen, setConfirmRetryOpen] = useState(false)

  const jobQuery = useQuery({
    queryKey: ['ingestion-jobs', jobId],
    queryFn: () => API_GetIngestionJob(jobId),
    refetchInterval: (query) =>
      query.state.data && isJobActive(query.state.data.status) ? POLL_INTERVAL_MS : false,
  })

  const attemptsQuery = useQuery({
    queryKey: ['ingestion-jobs', jobId, 'attempts'],
    queryFn: () => API_ListIngestionAttempts(jobId),
    retry: false,
    refetchInterval: () =>
      jobQuery.data && isJobActive(jobQuery.data.status) ? POLL_INTERVAL_MS : false,
  })

  const retryMutation = useMutation({
    mutationFn: () => API_RetryIngestionJob(jobId),
    onSuccess: async (newJob) => {
      setConfirmRetryOpen(false)
      toast.success(`Đã tạo lần chạy lại #${newJob.ingestion_job_id}.`)
      await queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] })
      onSelectJob(newJob.ingestion_job_id)
    },
    onError: () => {
      setConfirmRetryOpen(false)
    },
  })

  const cleaningKey = ['ingestion-cleaning', jobId]
  const cleaning = useMutation({
    mutationKey: cleaningKey,
    mutationFn: (profile: string) => API_RunCleaning(jobId, profile),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cleaning-runs'] })
    },
  })
  const isCleaning = useIsMutating({ mutationKey: cleaningKey }) > 0

  if (jobQuery.isPending) return <LoadingState />
  if (jobQuery.isError) {
    return (
      <ErrorState
        message={getApiErrorMessage(jobQuery.error, 'Không tải được thông tin lần nạp dữ liệu.')}
        onRetry={() => void jobQuery.refetch()}
      />
    )
  }

  const job = jobQuery.data
  const status = job.status.toUpperCase()
  const validationDetails = extractSafeValidationDetails(job.validation_report)
  const retryEligible = isJobRetryEligible(job)
  const datasetLabel = datasetNameMap.get(job.dataset_id)

  return (
    <div className="space-y-3 text-xs" id={`ingestion-job-${jobId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">
            Chi tiết lần nạp #{jobId}
            {job.attempt_number ? ` · Lần thử #${job.attempt_number}` : ''}
          </p>
          <p className="text-slate-600">
            <Tag tone={statusTone(job.status)}>{statusLabel(job.status)}</Tag> · Giai đoạn{' '}
            {job.stage ? statusLabel(job.stage) : '—'} · Loại {jobTypeLabel(job.job_type)} · Bộ dữ
            liệu {datasetLabel ? `${datasetLabel} (#${job.dataset_id})` : `#${job.dataset_id}`} ·
            Người yêu cầu {job.requested_by ?? '—'}
          </p>
        </div>

        {retryEligible && (
          <Button
            variant="soft"
            disabled={retryMutation.isPending}
            onClick={() => setConfirmRetryOpen(true)}
            icon={<RotateCcw className="size-3.5" aria-hidden="true" />}
          >
            Chạy lại thủ công
          </Button>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 bg-white p-3 sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Đọc / Ghi / Loại</dt>
          <dd className="mt-0.5 font-mono text-slate-900">
            {formatNumber(job.rows_read)} / {formatNumber(job.rows_written)} /{' '}
            {formatNumber(job.rows_rejected)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Tạo lúc</dt>
          <dd className="mt-0.5 text-slate-900">{formatDateTime(job.created_at)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Bắt đầu</dt>
          <dd className="mt-0.5 text-slate-900">{formatDateTime(job.started_at)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Kết thúc</dt>
          <dd className="mt-0.5 text-slate-900">{formatDateTime(job.finished_at)}</dd>
        </div>
      </dl>

      {status === 'SUCCESS' && (
        <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-emerald-900">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
              Đã lưu dữ liệu vào Bronze (chưa tự động xuất bản sang Silver).
            </span>
            <Link
              href={`/data/cleaning?jobId=${jobId}`}
              className="font-semibold text-[#a9162e] hover:underline"
            >
              Mở Cleaning &amp; Preview đầy đủ
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="space-y-1 text-slate-700">
              <span className="block font-medium">Mã cấu hình làm sạch</span>
              <input
                className={inputClass}
                maxLength={100}
                value={profileId}
                disabled={isCleaning}
                placeholder="vd. admissions-cleaning"
                onChange={(event) => setProfileId(event.target.value)}
              />
            </label>
            <Button
              variant="primary"
              className="self-end"
              disabled={isCleaning || !profileId.trim()}
              onClick={() => cleaning.mutate(profileId.trim())}
            >
              {isCleaning ? 'Đang làm sạch…' : 'Làm sạch dữ liệu'}
            </Button>
          </div>
        </div>
      )}

      {status === 'FAILED' && !retryEligible && (
        <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-600">
          Chức năng chạy lại thủ công hiện chỉ hỗ trợ cho các job tải tệp lên (UPLOAD_V1) đã ghim
          phiên bản.
        </p>
      )}

      {(job.error_message || validationDetails.length > 0) && (
        <div
          role="alert"
          className="space-y-1 rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-800"
        >
          <p className="font-semibold text-rose-900">
            {getErrorMessageForCode(job.error_message) ?? INGESTION_FAILURE}
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

      {retryMutation.isError && (
        <ErrorState
          message={getApiErrorMessage(retryMutation.error, 'Không thể chạy lại lần nạp này.')}
        />
      )}

      {cleaning.isError && (
        <ErrorState
          message={getApiErrorMessage(cleaning.error, 'Không chạy được tác vụ làm sạch.')}
        />
      )}
      {cleaning.data && (
        <p role="status" className="text-slate-700">
          <Tag tone={statusTone(cleaning.data.status)}>{statusLabel(cleaning.data.status)}</Tag> ·{' '}
          {formatNumber(cleaning.data.records_passed)} dòng đạt ·{' '}
          {formatNumber(cleaning.data.records_quarantined)} dòng cần kiểm tra ·{' '}
          {cleaning.data.publication
            ? 'Đã lưu kết quả làm sạch'
            : 'Chưa lưu kết quả vào bộ dữ liệu đã làm sạch'}
        </p>
      )}

      {/* Chuỗi lịch sử Attempts */}
      {attemptsQuery.data && attemptsQuery.data.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-semibold text-slate-800">Chuỗi lịch sử các lần chạy (Attempts)</p>
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-1.5 font-medium">
                    Lần thử
                  </th>
                  <th scope="col" className="px-3 py-1.5 font-medium">
                    Job ID
                  </th>
                  <th scope="col" className="px-3 py-1.5 font-medium">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-3 py-1.5 font-medium">
                    Giai đoạn
                  </th>
                  <th scope="col" className="px-3 py-1.5 font-medium">
                    Tạo lúc
                  </th>
                  <th scope="col" className="px-3 py-1.5 font-medium">
                    Lỗi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attemptsQuery.data.map((attempt) => (
                  <tr key={attempt.ingestion_job_id}>
                    <td className="px-3 py-1.5 font-mono font-semibold">
                      #{attempt.attempt_number}
                    </td>
                    <td className="px-3 py-1.5 font-mono">
                      <button
                        type="button"
                        onClick={() => onSelectJob(attempt.ingestion_job_id)}
                        className="text-[#b91830] hover:underline"
                      >
                        #{attempt.ingestion_job_id}
                      </button>
                    </td>
                    <td className="px-3 py-1.5">
                      <Tag tone={statusTone(attempt.status)}>{statusLabel(attempt.status)}</Tag>
                    </td>
                    <td className="px-3 py-1.5 text-slate-600">
                      {attempt.stage ? statusLabel(attempt.stage) : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-slate-500">
                      {formatDateTime(attempt.created_at)}
                    </td>
                    <td className="px-3 py-1.5 text-rose-700">
                      {attempt.error_message
                        ? (getErrorMessageForCode(attempt.error_message) ?? attempt.error_message)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={confirmRetryOpen} onOpenChange={setConfirmRetryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận chạy lại lần nạp #{jobId}</DialogTitle>
            <DialogDescription>
              Hệ thống sẽ tạo một lần chạy mới từ phiên bản tệp đã ghim của job #{jobId} và giữ
              nguyên lịch sử lần thất bại trước đó.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={retryMutation.isPending}
              onClick={() => setConfirmRetryOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              disabled={retryMutation.isPending}
              onClick={() => retryMutation.mutate()}
            >
              {retryMutation.isPending ? 'Đang gửi…' : 'Xác nhận chạy lại'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RunJobPanel({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (job: IngestionJob) => void
}) {
  const queryClient = useQueryClient()
  const [dataSourceId, setDataSourceId] = useState('')
  const [datasetId, setDatasetId] = useState('')
  const [sourceTable, setSourceTable] = useState('')
  const [validationPolicyJson, setValidationPolicyJson] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const sources = useQuery({
    queryKey: ['datasources', { page: 1, page_size: 100, is_active: true }],
    queryFn: () => API_ListDataSources({ page: 1, page_size: 100, is_active: true }),
  })

  const datasets = useQuery({
    queryKey: ['datasets', { limit: 100, offset: 0 }],
    queryFn: () => API_ListDatasets({ limit: 100, offset: 0 }),
  })

  const run = useMutation({
    mutationFn: API_CreateIngestionJob,
    onSuccess: async (job) => {
      await queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] })
      toast.success(`Đã tạo job thu thập #${job.ingestion_job_id}.`)
      onCreated(job)
      onClose()
    },
  })

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (run.isPending) return
    const dataset = Number(datasetId)
    if (!dataSourceId || !Number.isInteger(dataset) || dataset <= 0 || !sourceTable.trim()) {
      setFormError('Vui lòng chọn nguồn dữ liệu, bộ dữ liệu đích và điền tên tệp hoặc bảng nguồn.')
      return
    }
    let validationPolicy: Record<string, unknown> | null | undefined
    if (validationPolicyJson.trim()) {
      try {
        const parsed: unknown = JSON.parse(validationPolicyJson)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setFormError('validation_policy phải là JSON object hợp lệ.')
          return
        }
        validationPolicy = parsed as Record<string, unknown>
      } catch {
        setFormError('validation_policy chưa đúng cú pháp JSON.')
        return
      }
    }
    setFormError(null)
    run.mutate({
      data_source_id: Number(dataSourceId),
      dataset_id: dataset,
      source_table: sourceTable.trim(),
      ...(validationPolicy ? { validation_policy: validationPolicy } : {}),
    })
  }

  return (
    <Card
      title="Phương thức B: Chạy nạp từ nguồn dữ liệu đã đăng ký"
      subtitle="Gọi POST /api/v1/ingestion/jobs để thu thập dữ liệu từ nguồn đã cấu hình vào Bronze."
      right={
        <Button variant="ghost" onClick={onClose} aria-label="Đóng form chạy nạp dữ liệu">
          <X className="size-4" aria-hidden="true" />
        </Button>
      }
    >
      <form className="grid gap-4 md:grid-cols-3" onSubmit={onSubmit} noValidate>
        <div className="space-y-1.5">
          <label htmlFor="job-source" className="block text-xs font-semibold text-slate-700">
            Nguồn dữ liệu *
          </label>
          <select
            id="job-source"
            className={inputClass}
            value={dataSourceId}
            onChange={(event) => setDataSourceId(event.target.value)}
          >
            <option value="">
              {sources.isPending ? 'Đang tải…' : 'Chọn nguồn đang hoạt động'}
            </option>
            {sources.data?.items.map((source) => (
              <option key={source.data_source_id} value={source.data_source_id}>
                #{source.data_source_id} · {source.source_name} ({source.source_type})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="job-dataset" className="block text-xs font-semibold text-slate-700">
            Bộ dữ liệu đích *
          </label>
          {datasets.data && datasets.data.length > 0 ? (
            <select
              id="job-dataset"
              className={inputClass}
              value={datasetId}
              onChange={(event) => setDatasetId(event.target.value)}
            >
              <option value="">Chọn bộ dữ liệu Bronze</option>
              {datasets.data.map((ds) => (
                <option key={ds.dataset_id} value={String(ds.dataset_id)}>
                  {ds.dataset_name} (#{ds.dataset_id})
                </option>
              ))}
            </select>
          ) : (
            <input
              id="job-dataset"
              inputMode="numeric"
              className={`${inputClass} font-mono`}
              value={datasetId}
              placeholder="vd. 2"
              onChange={(event) => setDatasetId(event.target.value)}
            />
          )}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="job-table" className="block text-xs font-semibold text-slate-700">
            File / bảng nguồn *
          </label>
          <input
            id="job-table"
            className={`${inputClass} font-mono`}
            value={sourceTable}
            placeholder="02-academic.csv"
            onChange={(event) => setSourceTable(event.target.value)}
          />
        </div>
        <div className="space-y-1.5 md:col-span-3">
          <label htmlFor="job-policy" className="block text-xs font-semibold text-slate-700">
            Validation policy JSON (tùy chọn)
          </label>
          <input
            id="job-policy"
            className={`${inputClass} font-mono`}
            value={validationPolicyJson}
            placeholder='{"require_non_empty": true}'
            onChange={(event) => setValidationPolicyJson(event.target.value)}
          />
        </div>
        {(formError || run.isError) && (
          <p role="alert" className="text-xs text-rose-600 md:col-span-3">
            {formError ??
              getApiErrorMessage(run.error, 'Không thể bắt đầu nạp dữ liệu. Vui lòng thử lại.')}
          </p>
        )}
        <div className="flex justify-end md:col-span-3">
          <button
            type="submit"
            disabled={run.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#b91830] px-3 text-xs font-semibold text-white hover:bg-[#9e1429] disabled:opacity-70"
          >
            <Play className="size-3.5" aria-hidden="true" />
            {run.isPending ? 'Đang gửi…' : 'Chạy nạp dữ liệu'}
          </button>
        </div>
      </form>
    </Card>
  )
}

function UploadFilePanel({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (job: IngestionJob) => void
}) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadMode, setUploadMode] = useState<'existing' | 'new'>('existing')
  const [datasetId, setDatasetId] = useState('')
  const [datasetName, setDatasetName] = useState('')
  const [domain, setDomain] = useState<UploadDomain>('hr')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [customizeParser, setCustomizeParser] = useState(false)
  const [csvEncoding, setCsvEncoding] = useState('utf-8')
  const [csvDelimiter, setCsvDelimiter] = useState(',')
  const [csvQuoteChar, setCsvQuoteChar] = useState('"')
  const [excelSheetName, setExcelSheetName] = useState('')
  const [excelHeaderRow, setExcelHeaderRow] = useState('1')
  const [skipRows, setSkipRows] = useState('0')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const datasetsQuery = useQuery({
    queryKey: ['datasets', { limit: 100, offset: 0 }],
    queryFn: () => API_ListDatasets({ limit: 100, offset: 0 }),
  })

  const uploadMutation = useMutation({
    mutationFn: API_UploadIngestion,
    onSuccess: async (job) => {
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setDatasetName('')
      setDescription('')
      setCustomizeParser(false)
      setUploadProgress(null)
      toast.success(`Đã tiếp nhận tệp tải lên (Job #${job.ingestion_job_id}).`)
      await queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] })
      await queryClient.invalidateQueries({ queryKey: ['datasets'] })
      onCreated(job)
      onClose()
    },
    onError: () => {
      setUploadProgress(null)
    },
  })

  const isCsv = selectedFile ? isCsvFilename(selectedFile.name) : false
  const isExcel = selectedFile ? isExcelFilename(selectedFile.name) : false

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (uploadMutation.isPending) return
    setFormError(null)
    uploadMutation.reset()

    if (!selectedFile) {
      setFormError('Vui lòng chọn tệp CSV, XLSX hoặc XLSM.')
      return
    }
    const ext = getFileExtension(selectedFile.name)
    if (!['.csv', '.xlsx', '.xlsm'].includes(ext)) {
      setFormError('Chỉ hỗ trợ định dạng .csv, .xlsx hoặc .xlsm.')
      return
    }
    if (!isValidUploadFilename(selectedFile.name)) {
      setFormError('Tên tệp chỉ gồm chữ không dấu, số, dấu gạch ngang, gạch dưới và dấu chấm.')
      return
    }
    if (selectedFile.size === 0) {
      setFormError('Tệp không có nội dung (0 byte).')
      return
    }

    let parserOptions: Record<string, unknown> | undefined
    if (customizeParser) {
      const parsedSkip = Number(skipRows)
      if (!Number.isInteger(parsedSkip) || parsedSkip < 0) {
        setFormError('skip_rows phải là số nguyên >= 0.')
        return
      }
      if (isCsv) {
        parserOptions = {
          encoding: csvEncoding,
          delimiter: csvDelimiter,
          quote_char: csvQuoteChar,
          skip_rows: parsedSkip,
        }
      } else if (isExcel) {
        const parsedHeader = Number(excelHeaderRow)
        if (!Number.isInteger(parsedHeader) || parsedHeader < 1) {
          setFormError('header_row phải >= 1.')
          return
        }
        parserOptions = {
          header_row: parsedHeader,
          skip_rows: parsedSkip,
          ...(excelSheetName.trim() ? { sheet_name: excelSheetName.trim() } : {}),
        }
      }
    }

    if (uploadMode === 'existing') {
      const dsId = Number(datasetId)
      if (!Number.isInteger(dsId) || dsId <= 0) {
        setFormError('Vui lòng chọn bộ dữ liệu đích.')
        return
      }
      setUploadProgress(0)
      uploadMutation.mutate({
        mode: 'existing',
        file: selectedFile,
        datasetId: dsId,
        parserOptions,
        onUploadProgress: setUploadProgress,
      })
      return
    }

    if (!datasetName.trim()) {
      setFormError('Vui lòng nhập tên bộ dữ liệu mới.')
      return
    }
    setUploadProgress(0)
    uploadMutation.mutate({
      mode: 'new',
      file: selectedFile,
      datasetName: datasetName.trim(),
      domain,
      description: description.trim() || undefined,
      parserOptions,
      onUploadProgress: setUploadProgress,
    })
  }

  return (
    <Card
      title="Phương thức A: Tải tệp từ máy (POST /api/v1/ingestion/uploads)"
      subtitle="Hỗ trợ CSV, XLSX, XLSM. Tạo job lưu vào Bronze (chưa xuất bản Silver)."
      right={
        <Button variant="ghost" onClick={onClose} aria-label="Đóng form tải tệp">
          <X className="size-4" aria-hidden="true" />
        </Button>
      }
    >
      <form className="space-y-4 text-xs" onSubmit={handleSubmit} noValidate>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={uploadMode === 'existing' ? 'soft' : 'outline'}
            onClick={() => setUploadMode('existing')}
          >
            Chọn bộ dữ liệu đã có
          </Button>
          <Button
            variant={uploadMode === 'new' ? 'soft' : 'outline'}
            onClick={() => setUploadMode('new')}
          >
            Tạo bộ dữ liệu mới
          </Button>
        </div>

        {uploadMode === 'existing' ? (
          <div className="space-y-1.5">
            <label htmlFor="upload-dataset-select" className="block font-semibold text-slate-700">
              Bộ dữ liệu đích *
            </label>
            <select
              id="upload-dataset-select"
              className={inputClass}
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
            >
              <option value="">Chọn bộ dữ liệu Bronze</option>
              {(datasetsQuery.data ?? []).map((ds) => (
                <option key={ds.dataset_id} value={String(ds.dataset_id)}>
                  {ds.dataset_name} ({ds.domain} · #{ds.dataset_id})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="upload-new-name" className="block font-semibold text-slate-700">
                Tên bộ dữ liệu mới *
              </label>
              <input
                id="upload-new-name"
                className={inputClass}
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="vd. Danh sách sinh viên 2026"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="upload-new-domain" className="block font-semibold text-slate-700">
                Lĩnh vực *
              </label>
              <select
                id="upload-new-domain"
                className={inputClass}
                value={domain}
                onChange={(e) => setDomain(e.target.value as UploadDomain)}
              >
                {DATA_DOMAINS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="upload-new-desc" className="block font-semibold text-slate-700">
                Mô tả (tùy chọn)
              </label>
              <input
                id="upload-new-desc"
                className={inputClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="admin-upload-file" className="block font-semibold text-slate-700">
            Tệp dữ liệu (.csv, .xlsx, .xlsm) *
          </label>
          <input
            ref={fileInputRef}
            id="admin-upload-file"
            type="file"
            accept=".csv,.xlsx,.xlsm"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="block w-full cursor-pointer rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#b91830] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          />
        </div>

        {selectedFile && (
          <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <label className="flex cursor-pointer items-center gap-2 font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={customizeParser}
                onChange={(e) => setCustomizeParser(e.target.checked)}
                className="size-4 accent-[#b91830]"
              />
              Tùy chỉnh cấu hình đọc tệp (Parser options)
            </label>

            {customizeParser && isCsv && (
              <div className="grid gap-3 sm:grid-cols-4">
                <select
                  aria-label="Bảng mã CSV"
                  className={inputClass}
                  value={csvEncoding}
                  onChange={(e) => setCsvEncoding(e.target.value)}
                >
                  {CSV_ENCODING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Dấu phân cách CSV"
                  className={inputClass}
                  value={csvDelimiter}
                  onChange={(e) => setCsvDelimiter(e.target.value)}
                >
                  {CSV_DELIMITER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Ký tự trích dẫn CSV"
                  className={inputClass}
                  value={csvQuoteChar}
                  onChange={(e) => setCsvQuoteChar(e.target.value)}
                >
                  {CSV_QUOTE_CHAR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Số dòng bỏ qua"
                  type="number"
                  min={0}
                  className={inputClass}
                  value={skipRows}
                  onChange={(e) => setSkipRows(e.target.value)}
                />
              </div>
            )}

            {customizeParser && isExcel && (
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  aria-label="Tên sheet"
                  className={inputClass}
                  placeholder="Sheet (mặc định đầu tiên)"
                  value={excelSheetName}
                  onChange={(e) => setExcelSheetName(e.target.value)}
                />
                <input
                  aria-label="Dòng tiêu đề"
                  type="number"
                  min={1}
                  className={inputClass}
                  value={excelHeaderRow}
                  onChange={(e) => setExcelHeaderRow(e.target.value)}
                />
                <input
                  aria-label="Số dòng bỏ qua"
                  type="number"
                  min={0}
                  className={inputClass}
                  value={skipRows}
                  onChange={(e) => setSkipRows(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {uploadProgress !== null && (
          <div className="space-y-1">
            <div className="flex justify-between font-medium">
              <span>Đang tải tệp lên…</span>
              <span className="font-mono">{uploadProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#b91830]"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {(formError || uploadMutation.isError) && (
          <p role="alert" className="text-rose-600">
            {formError ?? getApiErrorMessage(uploadMutation.error, 'Không thể tải tệp lên.')}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={uploadMutation.isPending}
            icon={<Upload className="size-3.5" aria-hidden="true" />}
          >
            {uploadMutation.isPending ? 'Đang tải lên…' : 'Tải lên và tạo job'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export function IngestionView({ initialJobId }: { initialJobId?: number }) {
  const [activePanel, setActivePanel] = useState<'none' | 'run' | 'upload'>('none')
  const [selectedJobId, setSelectedJobId] = useState<number | null>(initialJobId ?? null)
  const [statusFilter, setStatusFilter] = useState('')
  const [datasetFilter, setDatasetFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [offset, setOffset] = useState(0)

  const statsQuery = useQuery({
    queryKey: ['ingestion-jobs', 'stats'],
    queryFn: API_GetIngestionStats,
    retry: false,
  })

  const metricsQuery = useQuery({
    queryKey: ['ingestion-jobs', 'metrics'],
    queryFn: API_GetIngestionMetrics,
    retry: false,
  })

  const datasetsQuery = useQuery({
    queryKey: ['datasets', { limit: 100, offset: 0 }],
    queryFn: () => API_ListDatasets({ limit: 100, offset: 0 }),
    retry: false,
  })

  const sourcesQuery = useQuery({
    queryKey: ['datasources', { page: 1, page_size: 100 }],
    queryFn: () => API_ListDataSources({ page: 1, page_size: 100 }),
    retry: false,
  })

  const jobs = useQuery({
    queryKey: [
      'ingestion-jobs',
      {
        limit: PAGE_SIZE,
        offset,
        status: statusFilter || undefined,
        dataset_id: datasetFilter ? Number(datasetFilter) : undefined,
        data_source_id: sourceFilter ? Number(sourceFilter) : undefined,
        mine_only: mineOnly,
      },
    ],
    queryFn: () =>
      API_ListIngestionJobs({
        limit: PAGE_SIZE,
        offset,
        status: (statusFilter as IngestionJobStatusFilter) || undefined,
        dataset_id: datasetFilter ? Number(datasetFilter) : undefined,
        data_source_id: sourceFilter ? Number(sourceFilter) : undefined,
        mine_only: mineOnly || undefined,
      }),
    refetchInterval: (query) =>
      query.state.data?.some((job) => isJobActive(job.status)) ? POLL_INTERVAL_MS : false,
  })

  const datasetNameMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const ds of datasetsQuery.data ?? []) {
      map.set(ds.dataset_id, ds.dataset_name)
    }
    return map
  }, [datasetsQuery.data])

  const list = jobs.data ?? []
  const stats = statsQuery.data

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Nạp dữ liệu']}
        title="Giám sát nạp dữ liệu (Ingestion)"
        description="Hỗ trợ tải tệp trực tiếp hoặc thu thập từ nguồn đăng ký vào tầng Bronze, theo dõi trạng thái và chạy lại job upload đủ điều kiện."
        actions={
          <>
            <Button
              onClick={() => {
                void jobs.refetch()
                void statsQuery.refetch()
                void metricsQuery.refetch()
              }}
              disabled={jobs.isFetching}
              icon={
                <RefreshCw
                  className={`size-3.5 ${jobs.isFetching ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
              }
            >
              Làm mới
            </Button>
            <Button
              variant="soft"
              onClick={() => setActivePanel(activePanel === 'upload' ? 'none' : 'upload')}
              icon={<Upload className="size-3.5" aria-hidden="true" />}
            >
              Tải tệp lên
            </Button>
            <Button
              variant="primary"
              onClick={() => setActivePanel(activePanel === 'run' ? 'none' : 'run')}
              icon={<Play className="size-3.5" aria-hidden="true" />}
            >
              Chạy từ nguồn
            </Button>
          </>
        }
      />

      {activePanel === 'upload' && (
        <UploadFilePanel
          onClose={() => setActivePanel('none')}
          onCreated={(job) => setSelectedJobId(job.ingestion_job_id)}
        />
      )}

      {activePanel === 'run' && (
        <RunJobPanel
          onClose={() => setActivePanel('none')}
          onCreated={(job) => setSelectedJobId(job.ingestion_job_id)}
        />
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Tổng lần nạp"
          value={stats ? formatNumber(stats.total) : '—'}
          hint={
            metricsQuery.data
              ? `Tỷ lệ lỗi ${metricsQuery.data.failure_rate_percent?.toFixed(1) ?? '0'}%`
              : undefined
          }
        />
        <KpiCard label="QUEUED" value={stats ? formatNumber(stats.queued) : '—'} tone="amber" />
        <KpiCard label="RUNNING" value={stats ? formatNumber(stats.running) : '—'} tone="amber" />
        <KpiCard
          label="RETRY_WAIT"
          value={stats ? formatNumber(stats.retry_wait ?? 0) : '—'}
          tone="amber"
        />
        <KpiCard
          label="SUCCESS (Bronze)"
          value={stats ? formatNumber(stats.success) : '—'}
          hint={
            metricsQuery.data
              ? `TB xử lý: ${formatSeconds(metricsQuery.data.average_processing_seconds)}`
              : undefined
          }
          tone="emerald"
        />
        <KpiCard label="FAILED" value={stats ? formatNumber(stats.failed) : '—'} tone="rose" />
      </div>

      {/* Bộ lọc */}
      <Card>
        <div className="flex flex-wrap items-end gap-3 text-xs">
          <div className="space-y-1">
            <label htmlFor="admin-job-status" className="block font-semibold text-slate-700">
              Trạng thái
            </label>
            <select
              id="admin-job-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setOffset(0)
              }}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
            >
              {JOB_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="admin-job-dataset" className="block font-semibold text-slate-700">
              Bộ dữ liệu
            </label>
            <select
              id="admin-job-dataset"
              value={datasetFilter}
              onChange={(e) => {
                setDatasetFilter(e.target.value)
                setOffset(0)
              }}
              className="h-9 min-w-[180px] rounded-md border border-slate-300 bg-white px-3 text-xs"
            >
              <option value="">Tất cả bộ dữ liệu</option>
              {(datasetsQuery.data ?? []).map((ds) => (
                <option key={ds.dataset_id} value={String(ds.dataset_id)}>
                  {ds.dataset_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="admin-job-source" className="block font-semibold text-slate-700">
              Nguồn dữ liệu
            </label>
            <select
              id="admin-job-source"
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value)
                setOffset(0)
              }}
              className="h-9 min-w-[180px] rounded-md border border-slate-300 bg-white px-3 text-xs"
            >
              <option value="">Tất cả nguồn</option>
              {(sourcesQuery.data?.items ?? []).map((s) => (
                <option key={s.data_source_id} value={String(s.data_source_id)}>
                  {s.source_name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 font-medium text-slate-700">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(e) => {
                setMineOnly(e.target.checked)
                setOffset(0)
              }}
              className="size-4 accent-[#b91830]"
            />
            Chỉ lần nạp của tôi
          </label>
        </div>
      </Card>

      <Card
        title="Lịch sử lần nạp dữ liệu"
        subtitle="Bấm vào một lần nạp để xem chi tiết, attempts và chạy lại (nếu đủ điều kiện)"
        bodyClassName="p-0"
      >
        {jobs.isPending ? (
          <LoadingState />
        ) : jobs.isError ? (
          <div className="p-4">
            <ErrorState
              message={getApiErrorMessage(jobs.error, 'Không tải được danh sách lần nạp dữ liệu.')}
              onRetry={() => void jobs.refetch()}
            />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title="Chưa có lần nạp dữ liệu nào"
            description="Hãy tải tệp lên hoặc chạy nạp từ nguồn dữ liệu đã đăng ký."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    {[
                      'Lần nạp',
                      'Tệp / bảng',
                      'Bộ dữ liệu',
                      'Loại',
                      'Trạng thái',
                      'Đọc / Ghi / Loại',
                      'Thời gian tạo',
                      'Lỗi',
                    ].map((head) => (
                      <th key={head} scope="col" className="px-3 py-2 font-medium">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((job) => {
                    const selected = selectedJobId === job.ingestion_job_id
                    const dsName = datasetNameMap.get(job.dataset_id)
                    return (
                      <Fragment key={job.ingestion_job_id}>
                        <tr className={selected ? 'bg-[#fff3f5]/50' : 'hover:bg-slate-50'}>
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              className="font-mono font-semibold text-[#a9162e] hover:underline"
                              aria-expanded={selected}
                              onClick={() =>
                                setSelectedJobId(selected ? null : job.ingestion_job_id)
                              }
                            >
                              Chi tiết lần nạp #{job.ingestion_job_id}
                            </button>
                          </td>
                          <td className="max-w-[160px] truncate px-3 py-2.5 font-mono text-slate-800">
                            {job.source_table ?? '—'}
                          </td>
                          <td className="max-w-[160px] truncate px-3 py-2.5 text-slate-700">
                            {dsName ?? `#${job.dataset_id}`}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {jobTypeLabel(job.job_type)}
                          </td>
                          <td className="px-3 py-2.5">
                            <Tag tone={statusTone(job.status)}>{statusLabel(job.status)}</Tag>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-700">
                            {formatNumber(job.rows_read)} / {formatNumber(job.rows_written)} /{' '}
                            {formatNumber(job.rows_rejected)}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                            {formatDateTime(job.created_at)}
                          </td>
                          <td className="max-w-[200px] truncate px-3 py-2.5 text-rose-700">
                            {job.error_message
                              ? (getErrorMessageForCode(job.error_message) ?? INGESTION_FAILURE)
                              : '—'}
                          </td>
                        </tr>
                        {selected && (
                          <tr className="bg-slate-50">
                            <td colSpan={8} className="p-4">
                              <JobDetails
                                jobId={job.ingestion_job_id}
                                datasetNameMap={datasetNameMap}
                                onSelectJob={setSelectedJobId}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
              <span>
                Hiển thị {list.length} lần nạp (từ vị trí {offset + 1})
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  disabled={offset === 0 || jobs.isFetching}
                  onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                  icon={<ChevronLeft className="size-3.5" aria-hidden="true" />}
                >
                  Trang trước
                </Button>
                <Button
                  disabled={list.length < PAGE_SIZE || jobs.isFetching}
                  onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                  icon={<ChevronRight className="size-3.5" aria-hidden="true" />}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {selectedJobId !== null && !list.some((j) => j.ingestion_job_id === selectedJobId) && (
        <Card title={`Chi tiết lần nạp #${selectedJobId}`}>
          <JobDetails
            jobId={selectedJobId}
            datasetNameMap={datasetNameMap}
            onSelectJob={setSelectedJobId}
          />
        </Card>
      )}

      {list.some((j) => j.status.toUpperCase() === 'FAILED') && (
        <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <CircleAlert className="size-4 shrink-0 text-rose-600" aria-hidden="true" />
          <span>
            Có lần nạp bị lỗi trong danh sách. Mở chi tiết để xem báo cáo kiểm tra hoặc chạy lại
            (với job upload).
          </span>
        </div>
      )}
    </div>
  )
}
