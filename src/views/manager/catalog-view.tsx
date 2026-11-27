'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Eye, FolderGit2, Plus, Search, Table2, Workflow, X } from 'lucide-react'

import { getApiErrorMessage } from '@/api/http'
import {
  API_ManagerCatalog,
  API_ManagerCatalogDetail,
  API_ManagerCatalogLineage,
} from '@/api/manager/catalog'
import type { ExplorerDataset } from '@/api/manager/catalog'
import type { ManagerContext } from '@/api/manager/reports'
import { FilterForm, filterControlClassName } from '@/components/page/filter-bar'
import {
  PageHeader,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Tag,
  formatDateTime,
  statusLabel,
  statusTone,
} from '@/components/page/page-parts'
import { TableSkeleton } from '@/components/ui/table-skeleton'

import { ManagerGate, Paging, label } from './report-parts'

type Domain = 'hr' | 'academic' | 'admissions'

const LAYER_STYLES: Record<string, { border: string; bg: string; badge: string; text: string }> = {
  BRONZE: {
    border: 'border-amber-200',
    bg: 'bg-amber-50/70',
    badge: 'bg-amber-100 text-amber-800',
    text: 'text-amber-700',
  },
  SILVER: {
    border: 'border-indigo-200',
    bg: 'bg-indigo-50/70',
    badge: 'bg-indigo-100 text-indigo-800',
    text: 'text-indigo-700',
  },
  GOLD: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/70',
    badge: 'bg-emerald-100 text-emerald-800',
    text: 'text-emerald-700',
  },
}

export function ManagerCatalogView() {
  return (
    <ManagerGate>
      {(context) => <CatalogContent key={context.user_id} context={context} />}
    </ManagerGate>
  )
}

function CatalogContent({ context }: { context: ManagerContext }) {
  const defaultDomain = (context.default_domain ?? context.domains[0]?.domain ?? 'hr') as Domain
  const [domain, setDomain] = useState<Domain>(defaultDomain)
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 20

  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null)
  const [lineageDataset, setLineageDataset] = useState<ExplorerDataset | null>(null)

  const departmentName = context.departments[0]?.department_name

  const catalogQuery = useQuery({
    queryKey: [
      'manager',
      'catalog',
      context.user_id,
      { domain, search: appliedSearch, page, pageSize },
    ],
    queryFn: () =>
      API_ManagerCatalog({
        domain,
        search: appliedSearch || undefined,
        limit: pageSize,
        offset: page * pageSize,
      }),
  })

  const detailQuery = useQuery({
    queryKey: ['manager', 'catalog', 'detail', context.user_id, selectedDatasetId],
    queryFn: () =>
      selectedDatasetId !== null ? API_ManagerCatalogDetail(selectedDatasetId) : null,
    enabled: selectedDatasetId !== null,
  })

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault()
    setAppliedSearch(searchInput.trim())
    setPage(0)
  }

  const allDatasets = catalogQuery.data?.items ?? []
  const filteredDatasets = statusFilter
    ? allDatasets.filter((d) => (d.status ?? 'ACTIVE').toUpperCase() === statusFilter.toUpperCase())
    : allDatasets

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FolderGit2 />}
        breadcrumb={['Quản lý dữ liệu', label(domain), ...(departmentName ? [departmentName] : [])]}
        title="Danh mục bộ dữ liệu phòng ban (Data Catalog)"
        description="Xem danh sách bộ dữ liệu, cấu trúc bảng/cột và truy vết nguồn gốc dữ liệu Bronze → Silver → Gold."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {context.domains.length > 1 && (
              <select
                aria-label="Chọn lĩnh vực"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value as Domain)
                  setPage(0)
                  setSelectedDatasetId(null)
                  setLineageDataset(null)
                }}
                className={filterControlClassName}
              >
                {context.domains.map((item) => (
                  <option key={item.domain} value={item.domain}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}
            <Link
              href="/manager/catalog/create"
              className="shadow-xs action-positive inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <span>Tạo bộ dữ liệu mới</span>
            </Link>
          </div>
        }
      />

      {/* Bộ lọc danh mục */}
      <FilterForm onSubmit={handleSearchSubmit}>
        <div className="relative min-w-0 basis-full sm:basis-80">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
          <input
            type="search"
            aria-label="Tìm bộ dữ liệu theo tên hoặc mã"
            placeholder="Tìm kiếm bộ dữ liệu theo tên hoặc mã…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={`${filterControlClassName} w-full pl-9`}
          />
        </div>

        <div className="w-44">
          <select
            aria-label="Lọc theo trạng thái"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${filterControlClassName} w-full`}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động (ACTIVE)</option>
            <option value="INACTIVE">Tạm dừng (INACTIVE)</option>
            <option value="DEPRECATED">Ngưng dùng (DEPRECATED)</option>
          </select>
        </div>
      </FilterForm>

      {/* Dataset Table */}
      <Card>
        {catalogQuery.isPending ? (
          <TableSkeleton rows={5} columns={6} />
        ) : catalogQuery.isError ? (
          <ErrorState
            message={getApiErrorMessage(catalogQuery.error, 'Không thể tải danh mục bộ dữ liệu.')}
            onRetry={() => void catalogQuery.refetch()}
            retrying={catalogQuery.isFetching}
          />
        ) : filteredDatasets.length === 0 ? (
          <EmptyState
            title="Không có bộ dữ liệu nào"
            description="Phòng ban chưa quy hoạch bộ dữ liệu nào hoặc không có dữ liệu khớp bộ lọc."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tên bộ dữ liệu</th>
                    <th className="px-4 py-3 font-semibold">Mã code</th>
                    <th className="px-4 py-3 font-semibold">Tầng / Miền</th>
                    <th className="px-4 py-3 text-center font-semibold">Số bảng</th>
                    <th className="px-4 py-3 font-semibold">Xuất bản Gold gần nhất</th>
                    <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredDatasets.map((ds) => (
                    <tr key={ds.dataset_id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <FolderGit2 className="size-4 shrink-0 text-primary" />
                          <div>
                            <span>{ds.dataset_name}</span>
                            {ds.description && (
                              <p className="line-clamp-1 text-[11px] font-normal text-slate-500">
                                {ds.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{ds.dataset_code}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Tag tone="indigo">{ds.domain.toUpperCase()}</Tag>
                          {ds.layer && <Tag tone="slate">{ds.layer.toUpperCase()}</Tag>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-slate-600">
                        {ds.tables?.length ?? 0}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {ds.last_published_at
                          ? formatDateTime(ds.last_published_at)
                          : ds.updated_at
                            ? formatDateTime(ds.updated_at)
                            : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            className="h-8 px-2 text-xs"
                            onClick={() => setSelectedDatasetId(ds.dataset_id)}
                            icon={<Eye className="size-3.5 text-slate-600" />}
                          >
                            Chi tiết
                          </Button>
                          <Button
                            variant="outline"
                            className="h-8 border-primary/20 px-2 text-xs text-primary hover:bg-primary/5"
                            onClick={() => setLineageDataset(ds)}
                            icon={<Workflow className="size-3.5" />}
                          >
                            Lineage
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paging
              page={page}
              setPage={setPage}
              total={catalogQuery.data?.total}
              count={filteredDatasets.length}
              size={pageSize}
            />
          </>
        )}
      </Card>

      {/* Dataset Detail Modal (bao gồm cấu trúc bảng & cột theo Catalog) */}
      {selectedDatasetId !== null && (
        <div className="backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <button
              type="button"
              aria-label="Đóng chi tiết bộ dữ liệu"
              onClick={() => setSelectedDatasetId(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-4" />
            </button>

            {detailQuery.isPending ? (
              <LoadingState label="Đang tải chi tiết bộ dữ liệu…" />
            ) : detailQuery.isError ? (
              <ErrorState
                message={getApiErrorMessage(
                  detailQuery.error,
                  'Không thể tải chi tiết bộ dữ liệu.'
                )}
                onRetry={() => void detailQuery.refetch()}
              />
            ) : detailQuery.data ? (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {detailQuery.data.dataset_name}
                  </h3>
                  <p className="mt-0.5 font-mono text-slate-500">
                    Mã: {detailQuery.data.dataset_code} (ID: #{detailQuery.data.dataset_id})
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 border-y border-slate-100 py-3 sm:grid-cols-4">
                  <div>
                    <span className="block text-slate-500">Lĩnh vực</span>
                    <span className="font-semibold uppercase text-slate-900">
                      {label(detailQuery.data.domain)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-500">Tầng dữ liệu</span>
                    <Tag tone="indigo">{(detailQuery.data.layer ?? 'BRONZE').toUpperCase()}</Tag>
                  </div>
                  <div>
                    <span className="block text-slate-500">Trạng thái</span>
                    <Tag tone={statusTone(detailQuery.data.status ?? 'ACTIVE')}>
                      {statusLabel(detailQuery.data.status ?? 'ACTIVE')}
                    </Tag>
                  </div>
                  <div>
                    <span className="block text-slate-500">Xuất bản Gold</span>
                    <span className="font-semibold text-slate-900">
                      {detailQuery.data.last_published_at
                        ? formatDateTime(detailQuery.data.last_published_at)
                        : detailQuery.data.updated_at
                          ? formatDateTime(detailQuery.data.updated_at)
                          : '—'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="mb-1 block font-medium text-slate-500">
                    Mô tả mục đích sử dụng
                  </span>
                  <p className="rounded-lg bg-slate-50 p-3 leading-relaxed text-slate-700">
                    {detailQuery.data.description || 'Chưa có mô tả chi tiết cho bộ dữ liệu này.'}
                  </p>
                </div>

                {/* Tables & Columns Schema */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Table2 className="size-4 text-primary" aria-hidden="true" />
                    <span>Cấu trúc bảng và cột dữ liệu</span>
                  </div>

                  {detailQuery.data.tables && detailQuery.data.tables.length > 0 ? (
                    <div className="space-y-3">
                      {detailQuery.data.tables.map((table) => (
                        <div
                          key={table.table_name}
                          className="overflow-hidden rounded-lg border border-slate-200"
                        >
                          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="font-mono font-semibold text-slate-900">
                              {table.table_name}
                            </p>
                            {table.description && (
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                {table.description}
                              </p>
                            )}
                          </div>
                          {table.columns.length > 0 ? (
                            <table className="w-full text-left text-[11px]">
                              <thead className="border-b border-slate-100 bg-white text-slate-500">
                                <tr>
                                  <th className="px-3 py-2 font-semibold">Tên cột</th>
                                  <th className="px-3 py-2 font-semibold">Kiểu dữ liệu</th>
                                  <th className="px-3 py-2 font-semibold">Cho phép trống</th>
                                  <th className="px-3 py-2 font-semibold">Mô tả</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {table.columns.map((col) => (
                                  <tr key={col.column_name}>
                                    <td className="px-3 py-2 font-mono font-medium text-slate-900">
                                      {col.column_name}
                                    </td>
                                    <td className="px-3 py-2 font-mono text-indigo-700">
                                      {col.data_type}
                                    </td>
                                    <td className="px-3 py-2 text-slate-600">
                                      {col.is_nullable === false ? 'Bắt buộc' : 'Tùy chọn'}
                                    </td>
                                    <td className="px-3 py-2 text-slate-600">
                                      {col.description || '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="p-3 text-slate-500">Chưa có danh mục cột cho bảng này.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-200 p-3 text-slate-500">
                      Chưa có metadata cấu trúc bảng/cột cho bộ dữ liệu này.
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="outline" onClick={() => setSelectedDatasetId(null)}>
                    Đóng
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Không tìm thấy thông tin bộ dữ liệu.</p>
            )}
          </div>
        </div>
      )}

      {/* Dataset Lineage Modal */}
      {lineageDataset && (
        <LineageModal
          dataset={lineageDataset}
          userId={context.user_id}
          onClose={() => setLineageDataset(null)}
        />
      )}
    </div>
  )
}

function LineageModal({
  dataset,
  userId,
  onClose,
}: {
  dataset: ExplorerDataset
  userId: number
  onClose: () => void
}) {
  const lineageQuery = useQuery({
    queryKey: ['manager', 'catalog', 'lineage', userId, dataset.dataset_id],
    queryFn: () => API_ManagerCatalogLineage(dataset.dataset_id, dataset.domain),
  })

  const steps = lineageQuery.data?.steps ?? []

  return (
    <div className="backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="relative max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
        <button
          type="button"
          aria-label="Đóng sơ đồ nguồn gốc dữ liệu"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="size-4" />
        </button>

        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Workflow className="size-5 text-primary" />
            <h2 className="text-base font-bold text-slate-900">Nguồn gốc dữ liệu (Data Lineage)</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Bộ dữ liệu: <strong className="text-slate-800">{dataset.dataset_name}</strong> (
            {dataset.dataset_code}) · Miền {label(dataset.domain)}
          </p>
        </div>

        <div className="my-5 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
          {lineageQuery.isPending ? (
            <LoadingState label="Đang tải sơ đồ nguồn gốc dữ liệu…" />
          ) : lineageQuery.isError ? (
            <ErrorState
              message={getApiErrorMessage(
                lineageQuery.error,
                'Không thể tải sơ đồ nguồn gốc dữ liệu.'
              )}
              onRetry={() => void lineageQuery.refetch()}
            />
          ) : steps.length === 0 ? (
            <EmptyState
              title="Chưa có bằng chứng nguồn gốc dữ liệu"
              description={
                lineageQuery.data?.note ??
                'Chỉ hiển thị các bước Bronze → Silver → Gold đã có bằng chứng gắn với bộ dữ liệu này.'
              }
            />
          ) : (
            <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
              {steps.map((step, index) => {
                const layerKey = (step.layer ?? 'BRONZE').toUpperCase()
                const style = LAYER_STYLES[layerKey] ?? LAYER_STYLES.BRONZE!
                return (
                  <div
                    key={`${layerKey}-${step.step_name}-${index}`}
                    className="flex flex-1 flex-col items-center gap-3 md:flex-row"
                  >
                    <div
                      className={`w-full flex-1 rounded-lg border ${style.border} ${style.bg} p-4`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}
                        >
                          {label(layerKey)}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}
                        >
                          {step.status === 'RECORDED' ? 'Đã ghi nhận' : label(step.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-900">{step.step_name}</p>
                      {step.artifact_uri && (
                        <p className="mt-1 break-all font-mono text-[11px] text-slate-600">
                          {step.artifact_uri}
                        </p>
                      )}
                      {step.executed_at && (
                        <p className="mt-2 text-[11px] text-slate-500">
                          Thực thi: {formatDateTime(step.executed_at)}
                        </p>
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <ArrowRight
                        className="hidden size-5 shrink-0 text-slate-400 md:block"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span>
            {lineageQuery.data?.note ??
              'Chỉ hiển thị các bước có bằng chứng gắn với bộ dữ liệu này.'}
          </span>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  )
}
