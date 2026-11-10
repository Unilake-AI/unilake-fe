'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Info, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

import { API_UpdateDataSource } from '@/api/data-operations/data-sources'
import { API_ListSourceSystems } from '@/api/data-operations/datasets'
import { getApiErrorMessage } from '@/api/http'
import { API_GetDataSource, API_ListDataSources } from '@/api/shared/data-sources'
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
import { SOURCE_SYSTEMS, SOURCE_TYPES } from '@/config/data-sources'
import type { DataSourceFilter, DataSourceItem } from '@/types/data'

const PAGE_SIZE = 10

const selectClass =
  'h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'

type StatusFilter = 'all' | 'active' | 'inactive'

export function SourcesView() {
  const queryClient = useQueryClient()
  const [systemId, setSystemId] = useState('')
  const [sourceType, setSourceType] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null)

  const filter: DataSourceFilter = {
    page,
    page_size: PAGE_SIZE,
    ...(systemId ? { source_system_id: Number(systemId) } : {}),
    ...(sourceType ? { source_type: sourceType } : {}),
    ...(status === 'all' ? {} : { is_active: status === 'active' }),
  }

  const sourceSystemsQuery = useQuery({
    queryKey: ['source-systems'],
    queryFn: API_ListSourceSystems,
    retry: false,
  })

  const sourceSystemOptions = useMemo(() => {
    if (sourceSystemsQuery.data && sourceSystemsQuery.data.length > 0) {
      return sourceSystemsQuery.data.map((sys) => ({
        id: sys.source_system_id,
        name: sys.source_name,
      }))
    }
    return SOURCE_SYSTEMS.map((sys) => ({ id: sys.id, name: sys.name }))
  }, [sourceSystemsQuery.data])

  const list = useQuery({
    queryKey: ['datasources', filter],
    queryFn: () => API_ListDataSources(filter),
    placeholderData: keepPreviousData,
  })

  // Số liệu tổng quan lấy trên toàn bộ nguồn (tối đa 100), không theo bộ lọc của bảng.
  const summary = useQuery({
    queryKey: ['datasources', 'summary'],
    queryFn: () => API_ListDataSources({ page: 1, page_size: 100 }),
  })

  const detailQuery = useQuery({
    queryKey: ['datasources', 'detail', selectedSourceId],
    queryFn: () => API_GetDataSource(selectedSourceId!),
    enabled: selectedSourceId !== null,
  })

  const toggle = useMutation({
    mutationFn: (source: DataSourceItem) =>
      API_UpdateDataSource(source.data_source_id, { is_active: !source.is_active }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['datasources'] })
      toast.success(`Đã ${saved.is_active ? 'bật' : 'tắt'} nguồn “${saved.source_name}”.`)
    },
  })

  const all = summary.data?.items ?? []
  const activeCount = all.filter((item) => item.is_active).length
  const lastFailed = all
    .filter((item) => item.last_ingestion_status?.toUpperCase() === 'FAILED')
    .sort((a, b) => (b.last_ingested_at ?? '').localeCompare(a.last_ingested_at ?? ''))[0]
  const totalRuns = all.reduce((sum, item) => sum + item.ingestion_count, 0)
  const systems = new Set(all.map((item) => item.source_system_id)).size

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1

  const visibleItems = useMemo(() => {
    const items = list.data?.items ?? []
    const q = keyword.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) =>
        item.source_name.toLowerCase().includes(q) ||
        (item.location ?? '').toLowerCase().includes(q) ||
        (item.description ?? '').toLowerCase().includes(q)
    )
  }, [keyword, list.data?.items])

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Nguồn dữ liệu']}
        title="Quản lý nguồn dữ liệu"
        description="Đăng ký, chỉnh sửa và bật/tắt các kết nối nguồn dữ liệu (CSV, Excel, JSON, REST API, PostgreSQL)."
        actions={
          <Link
            href="/data/sources/new"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Thêm nguồn dữ liệu
          </Link>
        }
      />

      <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        <Info className="mt-0.5 size-4 shrink-0 text-indigo-600" aria-hidden="true" />
        <p>
          <strong>Phân biệt Nguồn dữ liệu và Bộ dữ liệu (Dataset):</strong> Nguồn dữ liệu khai báo
          vị trí và giao thức đọc từ hệ thống ngoài; để lưu trữ vật lý tại tầng Bronze và chạy
          pipeline, hãy đăng ký hoặc chọn bộ dữ liệu tương ứng tại{' '}
          <Link href="/data/datasets" className="font-semibold text-indigo-600 hover:underline">
            Bộ dữ liệu (Datasets)
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex items-center text-xs text-slate-500">
          <span className="sr-only">Tìm theo tên hoặc vị trí nguồn</span>
          <Search
            className="pointer-events-none absolute left-2.5 size-3.5 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm tên nguồn hoặc vị trí…"
            className="h-8 w-56 rounded-md border border-slate-300 bg-white pl-8 pr-2 text-xs text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          Hệ thống nguồn:
          <select
            className={selectClass}
            value={systemId}
            onChange={(event) => resetPage(setSystemId)(event.target.value)}
          >
            <option value="">Tất cả</option>
            {sourceSystemOptions.map((system) => (
              <option key={system.id} value={system.id}>
                {system.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          Loại nguồn:
          <select
            className={selectClass}
            value={sourceType}
            onChange={(event) => resetPage(setSourceType)(event.target.value)}
          >
            <option value="">Tất cả</option>
            {SOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          Trạng thái:
          <select
            className={selectClass}
            value={status}
            onChange={(event) => resetPage(setStatus)(event.target.value as StatusFilter)}
          >
            <option value="all">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã tắt</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Nguồn đã đăng ký"
          value={summary.data ? formatNumber(summary.data.total) : '—'}
          hint={`${systems} hệ thống nguồn`}
        />
        <KpiCard
          label="Đang hoạt động"
          value={summary.data ? formatNumber(activeCount) : '—'}
          hint={`${all.length - activeCount} nguồn đã tắt`}
          tone="emerald"
        />
        <KpiCard
          label="Lần nạp gần nhất lỗi"
          value={lastFailed ? formatDateTime(lastFailed.last_ingested_at) : '—'}
          hint={lastFailed?.source_name ?? 'Không có nguồn lỗi'}
          tone={lastFailed ? 'rose' : 'slate'}
        />
        <KpiCard
          label="Tổng số lần nạp"
          value={summary.data ? formatNumber(totalRuns) : '—'}
          hint="Tính đến hôm nay"
        />
      </div>

      <Card
        title="Danh sách nguồn dữ liệu"
        subtitle={
          list.data
            ? `Hiển thị ${visibleItems.length} / ${list.data.total} nguồn`
            : 'Danh sách nguồn dữ liệu'
        }
        right={
          <span className="font-mono text-[10px] text-slate-400">
            page {page} / {totalPages}
          </span>
        }
        bodyClassName="p-0"
      >
        {list.isPending ? (
          <LoadingState />
        ) : list.isError ? (
          <div className="p-4">
            <ErrorState
              message={getApiErrorMessage(list.error, 'Không tải được danh sách nguồn dữ liệu.')}
              onRetry={() => void list.refetch()}
            />
          </div>
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title="Chưa có nguồn dữ liệu phù hợp"
            description="Đổi bộ lọc hoặc thêm nguồn dữ liệu mới."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-xs">
              <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  {[
                    'Nguồn dữ liệu',
                    'Hệ thống nguồn',
                    'Loại',
                    'Kết nối',
                    'Vị trí',
                    'Lần nạp gần nhất',
                    'Kết quả',
                    'Số lần',
                    'Trạng thái',
                    '',
                  ].map((head) => (
                    <th key={head} scope="col" className="px-3 py-2 font-medium">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleItems.map((source) => {
                  const isSelected = selectedSourceId === source.data_source_id
                  return (
                    <tr
                      key={source.data_source_id}
                      className={`align-top ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSourceId(isSelected ? null : source.data_source_id)
                          }
                          className="text-left font-semibold text-indigo-700 hover:underline"
                        >
                          {source.source_name}
                        </button>
                        <p className="font-mono text-[10px] text-slate-400">
                          data_source_id: {source.data_source_id}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {source.source_system_name ??
                          sourceSystemOptions.find((s) => s.id === source.source_system_id)?.name ??
                          `#${source.source_system_id}`}
                      </td>
                      <td className="px-3 py-2.5">
                        <Tag tone="sky">{source.source_type}</Tag>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">
                        {source.connection_type ?? '—'}
                      </td>
                      <td className="max-w-[260px] truncate px-3 py-2.5 font-mono text-[11px] text-slate-600">
                        {source.location ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">
                        {formatDateTime(source.last_ingested_at)}
                      </td>
                      <td className="px-3 py-2.5">
                        {source.last_ingestion_status ? (
                          <Tag tone={statusTone(source.last_ingestion_status)}>
                            {statusLabel(source.last_ingestion_status)}
                          </Tag>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">
                        {source.ingestion_count}
                      </td>
                      <td className="px-3 py-2.5">
                        <Tag tone={source.is_active ? 'emerald' : 'slate'}>
                          {source.is_active ? 'Đang hoạt động' : 'Đã tắt'}
                        </Tag>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        <Link
                          href={`/data/sources/${source.data_source_id}`}
                          className="inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                          aria-label={`Sửa nguồn ${source.source_name}`}
                        >
                          Sửa
                        </Link>
                        <Button
                          variant="ghost"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate(source)}
                          aria-label={`${source.is_active ? 'Tắt' : 'Bật'} nguồn ${source.source_name}`}
                        >
                          {source.is_active ? 'Tắt' : 'Bật'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {toggle.isError && (
          <p role="alert" className="border-t border-slate-200 px-4 py-2 text-xs text-rose-600">
            {getApiErrorMessage(toggle.error, 'Không đổi được trạng thái nguồn dữ liệu.')}
          </p>
        )}
        {list.data && totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              icon={<ChevronLeft className="size-3.5" aria-hidden="true" />}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        )}
      </Card>

      {/* Chi tiết nguồn dữ liệu được chọn */}
      {selectedSourceId !== null && (
        <Card
          title={`Chi tiết nguồn dữ liệu #${selectedSourceId}`}
          subtitle="Thông tin cấu hình kết nối nhạy cảm được ẩn theo chính sách bảo mật"
          right={
            <Button variant="ghost" onClick={() => setSelectedSourceId(null)}>
              Đóng
            </Button>
          }
        >
          {detailQuery.isPending ? (
            <LoadingState />
          ) : detailQuery.isError ? (
            <ErrorState
              message={getApiErrorMessage(detailQuery.error, 'Không tải được chi tiết nguồn.')}
              onRetry={() => void detailQuery.refetch()}
            />
          ) : (
            <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-slate-500">Tên nguồn</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">
                  {detailQuery.data.source_name}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Hệ thống nguồn</dt>
                <dd className="mt-0.5 text-slate-900">
                  {detailQuery.data.source_system_name ?? `#${detailQuery.data.source_system_id}`}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Loại / Kết nối</dt>
                <dd className="mt-0.5 font-mono text-slate-900">
                  {detailQuery.data.source_type} · {detailQuery.data.connection_type ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Trạng thái</dt>
                <dd className="mt-0.5">
                  <Tag tone={detailQuery.data.is_active ? 'emerald' : 'slate'}>
                    {detailQuery.data.is_active ? 'Đang hoạt động' : 'Đã tắt'}
                  </Tag>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Vị trí nguồn</dt>
                <dd className="mt-0.5 break-all font-mono text-slate-900">
                  {detailQuery.data.location ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Tạo lúc</dt>
                <dd className="mt-0.5 text-slate-900">
                  {formatDateTime(detailQuery.data.created_at)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Cập nhật gần nhất</dt>
                <dd className="mt-0.5 text-slate-900">
                  {formatDateTime(detailQuery.data.updated_at)}
                </dd>
              </div>
              {detailQuery.data.description && (
                <div className="sm:col-span-4">
                  <dt className="text-slate-500">Mô tả</dt>
                  <dd className="mt-0.5 text-slate-700">{detailQuery.data.description}</dd>
                </div>
              )}
            </dl>
          )}
        </Card>
      )}
    </div>
  )
}
