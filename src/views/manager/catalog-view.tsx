'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Database,
  Eye,
  FolderGit2,
  GitBranch,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Workflow,
  X,
} from 'lucide-react'

import { API_GetDataset, API_ListDatasets } from '@/api/shared/datasets'
import { API_GetLineage } from '@/api/admindata/governance'
import { getApiErrorMessage } from '@/api/http'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Tag,
  formatDateTime,
  statusLabel,
  statusTone,
} from '@/components/page/page-parts'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import type { DatasetItem } from '@/types/datasets'
import { ManagerGate } from './report-parts'

export function ManagerCatalogView() {
  return (
    <ManagerGate>
      {(context) => {
        const domain = (context.domains[0]?.domain as 'hr' | 'academic' | 'admissions') ?? 'hr'
        return <CatalogContent domain={domain} departmentName={context.departments[0]?.department_name} />
      }}
    </ManagerGate>
  )
}

function CatalogContent({
  domain,
  departmentName,
}: {
  domain: 'hr' | 'academic' | 'admissions'
  departmentName?: string
}) {
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [offset, setOffset] = useState(0)
  const pageSize = 20

  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null)
  const [lineageDataset, setLineageDataset] = useState<DatasetItem | null>(null)

  const datasetsQuery = useQuery({
    queryKey: ['manager', 'catalog', { domain, search: appliedSearch, status: statusFilter, offset }],
    queryFn: () =>
      API_ListDatasets({
        domain,
        search: appliedSearch || undefined,
        limit: pageSize,
        offset,
      }),
  })

  const detailQuery = useQuery({
    queryKey: ['manager', 'catalog', 'detail', selectedDatasetId],
    queryFn: () => (selectedDatasetId ? API_GetDataset(selectedDatasetId) : null),
    enabled: selectedDatasetId !== null,
  })

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault()
    setAppliedSearch(searchInput.trim())
    setOffset(0)
  }

  const allDatasets = datasetsQuery.data ?? []
  const filteredDatasets = statusFilter
    ? allDatasets.filter((d) => (d.status ?? 'ACTIVE').toUpperCase() === statusFilter.toUpperCase())
    : allDatasets

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Quản lý dữ liệu</span>
            <span>/</span>
            <span className="text-primary font-semibold uppercase">{domain}</span>
            {departmentName && <span>· {departmentName}</span>}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
            Danh sách bộ dữ liệu phòng ban
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quy hoạch và theo dõi các bộ dữ liệu do đơn vị sở hữu, nạp vào kho dữ liệu
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void datasetsQuery.refetch()}
            disabled={datasetsQuery.isFetching}
            icon={<RefreshCw className={`size-3.5 ${datasetsQuery.isFetching ? 'animate-spin' : ''}`} />}
          >
            Làm mới
          </Button>
          <Link
            href="/manager/catalog/create"
            className="shadow-xs inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            <span>Tạo bộ dữ liệu mới</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
            <input
              type="search"
              placeholder="Tìm kiếm bộ dữ liệu theo tên hoặc mã…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>

          <div className="w-44">
            <select
              aria-label="Lọc theo trạng thái"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Hoạt động (ACTIVE)</option>
              <option value="INACTIVE">Tạm dừng (INACTIVE)</option>
              <option value="DEPRECATED">Ngưng dùng (DEPRECATED)</option>
            </select>
          </div>

          <Button type="submit" variant="outline" className="h-9 text-xs">
            Tìm kiếm
          </Button>
        </form>
      </Card>

      {/* Dataset Table */}
      <Card>
        {datasetsQuery.isPending ? (
          <TableSkeleton rows={5} columns={5} />
        ) : datasetsQuery.isError ? (
          <ErrorState
            message={getApiErrorMessage(datasetsQuery.error, 'Không thể tải danh sách bộ dữ liệu.')}
            onRetry={() => void datasetsQuery.refetch()}
            retrying={datasetsQuery.isFetching}
          />
        ) : filteredDatasets.length === 0 ? (
          <EmptyState
            title="Không có bộ dữ liệu nào"
            description="Phòng ban chưa quy hoạch bộ dữ liệu nào hoặc không có dữ liệu khớp bộ lọc."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tên bộ dữ liệu</th>
                  <th className="px-4 py-3 font-semibold">Mã code</th>
                  <th className="px-4 py-3 font-semibold">Lĩnh vực</th>
                  <th className="px-4 py-3 font-semibold text-center">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Thời điểm cập nhật</th>
                  <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredDatasets.map((ds) => (
                  <tr key={ds.dataset_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <FolderGit2 className="size-4 text-primary shrink-0" />
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
                      <Tag tone="indigo">{ds.domain.toUpperCase()}</Tag>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Tag tone={statusTone(ds.status ?? 'ACTIVE')}>
                        {statusLabel(ds.status ?? 'ACTIVE')}
                      </Tag>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {ds.created_at ? formatDateTime(ds.created_at) : '—'}
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
                          className="h-8 px-2 text-xs text-primary border-primary/20 hover:bg-primary/5"
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
        )}
      </Card>

      {/* Dataset Detail Modal */}
      {selectedDatasetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <button
              onClick={() => setSelectedDatasetId(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-4" />
            </button>

            {detailQuery.isPending ? (
              <LoadingState label="Đang tải chi tiết bộ dữ liệu…" />
            ) : detailQuery.data ? (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {detailQuery.data.dataset_name}
                  </h3>
                  <p className="font-mono text-slate-500 mt-0.5">
                    Mã: {detailQuery.data.dataset_code} (ID: #{detailQuery.data.dataset_id})
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 border-y border-slate-100 py-3">
                  <div>
                    <span className="text-slate-500 block">Lĩnh vực</span>
                    <span className="font-semibold uppercase text-slate-900">
                      {detailQuery.data.domain}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Trạng thái</span>
                    <Tag tone={statusTone(detailQuery.data.status ?? 'ACTIVE')}>
                      {statusLabel(detailQuery.data.status ?? 'ACTIVE')}
                    </Tag>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Hệ thống nguồn ID</span>
                    <span className="font-semibold text-slate-900">
                      #{detailQuery.data.source_system_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Ngày tạo</span>
                    <span className="font-semibold text-slate-900">
                      {detailQuery.data.created_at
                        ? formatDateTime(detailQuery.data.created_at)
                        : '—'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Mô tả mục đích sử dụng</span>
                  <p className="rounded-lg bg-slate-50 p-3 text-slate-700 leading-relaxed">
                    {detailQuery.data.description || 'Chưa có mô tả chi tiết cho bộ dữ liệu này.'}
                  </p>
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
          onClose={() => setLineageDataset(null)}
        />
      )}
    </div>
  )
}

function LineageModal({
  dataset,
  onClose,
}: {
  dataset: DatasetItem
  onClose: () => void
}) {
  const lineageQuery = useQuery({
    queryKey: ['governance', 'lineage', { domain_id: dataset.domain }],
    queryFn: () => API_GetLineage({ domain_id: dataset.domain }),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="size-4" />
        </button>

        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Workflow className="size-5 text-primary" />
            <h2 className="text-base font-bold text-slate-900">
              Nguồn gốc dữ liệu (Data Lineage)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bộ dữ liệu: <strong className="text-slate-800">{dataset.dataset_name}</strong> ({dataset.dataset_code}) · Miền {dataset.domain.toUpperCase()}
          </p>
        </div>

        {/* Visual Lineage Flow Nodes */}
        <div className="my-6 rounded-xl border border-slate-200 bg-slate-50/50 p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Step 1: Bronze */}
            <div className="flex-1 w-full rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Tầng BRONZE</span>
              <p className="mt-1 font-semibold text-slate-900 text-xs">Tệp nguồn MinIO</p>
              <p className="text-[11px] text-slate-500 mt-0.5">CSV / Excel thô từ Staff</p>
              <div className="mt-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                raw_landing_zone
              </div>
            </div>

            <ArrowRight className="size-5 text-slate-400 hidden md:block shrink-0" />

            {/* Step 2: Cleaning */}
            <div className="flex-1 w-full rounded-lg border border-sky-200 bg-sky-50/60 p-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">TIẾN TRÌNH</span>
              <p className="mt-1 font-semibold text-slate-900 text-xs">Cleaning & Validation</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Áp dụng profile chuẩn hóa</p>
              <div className="mt-2 inline-block rounded bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-800">
                rule_execution
              </div>
            </div>

            <ArrowRight className="size-5 text-slate-400 hidden md:block shrink-0" />

            {/* Step 3: Silver */}
            <div className="flex-1 w-full rounded-lg border border-indigo-200 bg-indigo-50/60 p-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Tầng SILVER</span>
              <p className="mt-1 font-semibold text-slate-900 text-xs">Snapshot Silver</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Dữ liệu sạch đã chuẩn hóa</p>
              <div className="mt-2 inline-block rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-800">
                silver_{dataset.domain}
              </div>
            </div>

            <ArrowRight className="size-5 text-slate-400 hidden md:block shrink-0" />

            {/* Step 4: Gold */}
            <div className="flex-1 w-full rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Tầng GOLD</span>
              <p className="mt-1 font-semibold text-slate-900 text-xs">Báo cáo & Phân tích</p>
              <p className="text-[11px] text-slate-500 mt-0.5">KPIs và Hỏi đáp AI</p>
              <div className="mt-2 inline-block rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                gold_summary
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span>Luồng dữ liệu tự động đồng bộ theo chu kỳ nạp & phê duyệt của Manager</span>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  )
}
