'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Eye, RefreshCw } from 'lucide-react'

import { API_ListDatasets } from '@/api/data-operations/datasets'
import { API_ListIssueDepartments } from '@/api/data-operations/quality-issues'
import {
  API_GetQuarantineRecord,
  API_GetQuarantineSource,
  API_GetQuarantineSummary,
  API_ListQuarantineRecords,
} from '@/api/data-operations/quarantine'
import { getApiErrorMessage } from '@/api/http'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  KpiCard,
  LoadingState,
  PageHeader,
  Tag,
  formatNumber,
} from '@/components/page/page-parts'

import { domainLabel, formatCellValue } from './data-helpers'

const PAGE_SIZE = 20

const inputClass =
  'h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30'

export function QuarantineView() {
  const [cleaningRunId, setCleaningRunId] = useState('')
  const [ingestionJobId, setIngestionJobId] = useState('')
  const [datasetId, setDatasetId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [appliedFilters, setAppliedFilters] = useState<{
    cleaning_run_id?: string
    ingestion_job_id?: number
    dataset_id?: number
    owner_department_id?: number
    error_code?: string
  }>({})
  const [offset, setOffset] = useState(0)
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const [loadSourceForId, setLoadSourceForId] = useState<string | null>(null)

  const datasetsQuery = useQuery({
    queryKey: ['datasets', { limit: 100, offset: 0 }],
    queryFn: () => API_ListDatasets({ limit: 100, offset: 0 }),
  })
  const departmentsQuery = useQuery({
    queryKey: ['quality-issues', 'departments'],
    queryFn: API_ListIssueDepartments,
  })

  const summaryQuery = useQuery({
    queryKey: ['quarantine-records', 'summary', appliedFilters],
    queryFn: () => API_GetQuarantineSummary(appliedFilters),
  })

  const listQuery = useQuery({
    queryKey: ['quarantine-records', 'list', { ...appliedFilters, limit: PAGE_SIZE, offset }],
    queryFn: () =>
      API_ListQuarantineRecords({
        ...appliedFilters,
        limit: PAGE_SIZE,
        offset,
      }),
  })

  const detailQuery = useQuery({
    queryKey: ['quarantine-records', 'detail', selectedRecordId],
    queryFn: () => API_GetQuarantineRecord(selectedRecordId!),
    enabled: selectedRecordId !== null,
  })

  const sourceQuery = useQuery({
    queryKey: ['quarantine-records', 'source', loadSourceForId],
    queryFn: () => API_GetQuarantineSource(loadSourceForId!),
    enabled: loadSourceForId !== null,
    retry: false,
  })

  function applyFilters(event: FormEvent) {
    event.preventDefault()
    setOffset(0)
    const parsedJob = Number(ingestionJobId)
    setAppliedFilters({
      cleaning_run_id: cleaningRunId.trim() || undefined,
      ingestion_job_id:
        ingestionJobId.trim() && Number.isInteger(parsedJob) && parsedJob > 0
          ? parsedJob
          : undefined,
      dataset_id: datasetId ? Number(datasetId) : undefined,
      owner_department_id: departmentId ? Number(departmentId) : undefined,
      error_code: errorCode.trim() || undefined,
    })
  }

  const records = listQuery.data ?? []
  const summary = summaryQuery.data
  const sourcePayload = sourceQuery.data as
    | {
        data?: Record<string, unknown>
        invalid_fields?: string[]
        source?: Record<string, unknown>
      }
    | undefined

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Hồ sơ cách ly (Quarantine)']}
        title="Quản lý hồ sơ cách ly (Quarantine)"
        description="Tra cứu các bản ghi bị loại trong quá trình Cleaning, xem vị trí dòng nguồn và dữ liệu gốc trong phạm vi cột cho phép."
        actions={
          <Button
            onClick={() => {
              void listQuery.refetch()
              void summaryQuery.refetch()
            }}
            disabled={listQuery.isFetching}
            icon={
              <RefreshCw
                className={`size-3.5 ${listQuery.isFetching ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
            }
          >
            Làm mới
          </Button>
        }
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Tổng hồ sơ cách ly"
          value={summary ? formatNumber(summary.total_records) : '—'}
          tone={summary && summary.total_records > 0 ? 'amber' : 'slate'}
        />
        <KpiCard
          label="Số bộ dữ liệu có lỗi"
          value={summary ? formatNumber(summary.by_dataset.length) : '—'}
        />
        <KpiCard
          label="Số đơn vị liên quan"
          value={summary ? formatNumber(summary.by_owner_department.length) : '—'}
        />
        <KpiCard
          label="Số mã lỗi khác nhau"
          value={summary ? formatNumber(summary.by_error_code.length) : '—'}
        />
      </div>

      {/* Bộ lọc */}
      <Card>
        <form className="flex flex-wrap items-end gap-2 text-xs" onSubmit={applyFilters}>
          <label className="space-y-1">
            <span className="block font-semibold text-slate-700">Cleaning Run ID</span>
            <input
              className={`${inputClass} w-52 font-mono`}
              value={cleaningRunId}
              onChange={(e) => setCleaningRunId(e.target.value)}
              placeholder="UUID lượt chạy"
            />
          </label>
          <label className="space-y-1">
            <span className="block font-semibold text-slate-700">Job ID</span>
            <input
              className={`${inputClass} w-28 font-mono`}
              inputMode="numeric"
              value={ingestionJobId}
              onChange={(e) => setIngestionJobId(e.target.value)}
              placeholder="vd. 42"
            />
          </label>
          <label className="space-y-1">
            <span className="block font-semibold text-slate-700">Bộ dữ liệu</span>
            <select
              className={inputClass}
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
            >
              <option value="">Tất cả</option>
              {(datasetsQuery.data ?? []).map((ds) => (
                <option key={ds.dataset_id} value={String(ds.dataset_id)}>
                  {ds.dataset_name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block font-semibold text-slate-700">Đơn vị</span>
            <select
              className={inputClass}
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">Tất cả</option>
              {(departmentsQuery.data ?? []).map((dept) => (
                <option key={dept.department_id} value={String(dept.department_id)}>
                  {dept.department_name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block font-semibold text-slate-700">Mã lỗi (error_code)</span>
            <input
              className={`${inputClass} w-44 font-mono`}
              value={errorCode}
              onChange={(e) => setErrorCode(e.target.value)}
              placeholder="vd. INVALID_DATE"
            />
          </label>
          <Button type="submit" variant="primary">
            Lọc hồ sơ
          </Button>
        </form>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card title="Danh sách hồ sơ cách ly" bodyClassName="p-0">
          {listQuery.isPending ? (
            <LoadingState />
          ) : listQuery.isError ? (
            <div className="p-4">
              <ErrorState
                message={getApiErrorMessage(listQuery.error, 'Không tải được hồ sơ cách ly.')}
                onRetry={() => void listQuery.refetch()}
              />
            </div>
          ) : records.length === 0 ? (
            <EmptyState title="Không có hồ sơ cách ly phù hợp" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      {['Vị trí', 'Dataset / Entity', 'Job', 'Mã lỗi', 'Phiên bản Bronze'].map(
                        (h) => (
                          <th key={h} scope="col" className="px-3 py-2 font-medium">
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((rec) => {
                      const active = selectedRecordId === rec.record_id
                      return (
                        <tr
                          key={rec.record_id}
                          className={active ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}
                        >
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRecordId(rec.record_id)
                                setLoadSourceForId(null)
                              }}
                              className="text-left font-mono font-semibold text-indigo-600 hover:underline"
                            >
                              Dòng {formatNumber(rec.record_position)}
                            </button>
                            <p className="font-mono text-[10px] text-slate-400">{rec.locator}</p>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-slate-900">
                              Dataset #{rec.dataset_id} · {domainLabel(rec.domain)}
                            </p>
                            <p className="font-mono text-[11px] text-slate-500">{rec.entity}</p>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-700">
                            #{rec.ingestion_job_id}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {rec.error_codes.map((c) => (
                                <Tag key={c} tone="rose">
                                  {c}
                                </Tag>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-500">
                            {rec.bronze_version}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                <span>Hiển thị {records.length} hồ sơ</span>
                <div className="flex gap-1.5">
                  <Button
                    disabled={offset === 0}
                    onClick={() => setOffset((p) => Math.max(0, p - PAGE_SIZE))}
                    icon={<ChevronLeft className="size-3.5" aria-hidden="true" />}
                  >
                    Trước
                  </Button>
                  <Button
                    disabled={records.length < PAGE_SIZE}
                    onClick={() => setOffset((p) => p + PAGE_SIZE)}
                    icon={<ChevronRight className="size-3.5" aria-hidden="true" />}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Chi tiết & Xem dòng nguồn */}
        <Card
          title="Chi tiết hồ sơ cách ly"
          right={
            selectedRecordId && (
              <Button
                variant="outline"
                onClick={() => setLoadSourceForId(selectedRecordId)}
                icon={<Eye className="size-3.5" aria-hidden="true" />}
              >
                Xem dòng dữ liệu nguồn
              </Button>
            )
          }
        >
          {!selectedRecordId ? (
            <EmptyState
              title="Chọn một hồ sơ để xem chi tiết"
              description="Xem thông tin lỗi chi tiết và kiểm tra dữ liệu gốc trong giới hạn cột được cấp phép."
            />
          ) : detailQuery.isPending ? (
            <LoadingState />
          ) : detailQuery.isError ? (
            <ErrorState
              message={getApiErrorMessage(detailQuery.error, 'Không tải được chi tiết hồ sơ.')}
            />
          ) : (
            <div className="space-y-4 text-xs">
              <dl className="space-y-2">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Record ID</dt>
                  <dd className="font-mono text-slate-900">{detailQuery.data.record_id}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Tệp nguồn</dt>
                  <dd className="font-mono text-slate-900">
                    {typeof detailQuery.data.source.file_name === 'string'
                      ? detailQuery.data.source.file_name
                      : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Vị trí / Locator</dt>
                  <dd className="font-mono text-slate-900">
                    Dòng {formatNumber(detailQuery.data.record_position)} (
                    {detailQuery.data.locator})
                  </dd>
                </div>
                {typeof detailQuery.data.source.sheet_name === 'string' && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Sheet / Excel Row</dt>
                    <dd className="font-mono text-slate-900">
                      {detailQuery.data.source.sheet_name} · Dòng{' '}
                      {formatCellValue(detailQuery.data.source.excel_row_number)}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="space-y-1.5">
                <p className="font-semibold text-slate-800">Chi tiết lỗi kiểm tra</p>
                <pre className="max-h-44 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] text-slate-800">
                  {JSON.stringify(detailQuery.data.issues, null, 2)}
                </pre>
              </div>

              {loadSourceForId === selectedRecordId && (
                <div className="space-y-2 border-t border-slate-200 pt-3">
                  <p className="font-semibold text-slate-800">
                    Dữ liệu dòng nguồn (theo source_preview_columns)
                  </p>
                  {sourceQuery.isPending ? (
                    <LoadingState label="Đang đọc dòng nguồn từ Bronze…" />
                  ) : sourceQuery.isError ? (
                    <ErrorState
                      message={getApiErrorMessage(
                        sourceQuery.error,
                        'Không được phép hoặc không thể đọc dòng dữ liệu nguồn.'
                      )}
                      onRetry={() => void sourceQuery.refetch()}
                    />
                  ) : sourcePayload?.data ? (
                    <div className="overflow-x-auto rounded-md border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 font-mono text-[10px] uppercase text-slate-500">
                          <tr>
                            <th scope="col" className="px-2.5 py-1.5 font-medium">
                              Cột
                            </th>
                            <th scope="col" className="px-2.5 py-1.5 font-medium">
                              Giá trị
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Object.entries(sourcePayload.data).map(([col, val]) => {
                            const isInvalid = sourcePayload.invalid_fields?.includes(col)
                            return (
                              <tr key={col} className={isInvalid ? 'bg-rose-50' : undefined}>
                                <td className="px-2.5 py-1.5 font-mono font-semibold text-slate-800">
                                  {col}
                                  {isInvalid && (
                                    <span className="ml-1.5 text-[10px] text-rose-600">(Lỗi)</span>
                                  )}
                                </td>
                                <td className="break-all px-2.5 py-1.5 font-mono text-slate-700">
                                  {formatCellValue(val)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState title="Không có dữ liệu dòng nguồn trả về" />
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
