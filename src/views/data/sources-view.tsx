'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

import { API_UpdateDataSource } from '@/api/admindata/data-sources'
import { API_CreateSourceSystem, API_ListSourceSystems } from '@/api/admindata/datasets'
import { getApiErrorMessage } from '@/api/http'
import { API_GetDataSource, API_ListDataSources } from '@/api/shared/data-sources'
import { filterBarClassName, filterControlClassName } from '@/components/page/filter-bar'
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
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { SOURCE_TYPES } from '@/config/data-sources'
import type { DataSourceFilter, DataSourceItem, DataSourceStatusFilter } from '@/types/data-sources'

const PAGE_SIZE = 10

const selectClass =
  'h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91830]'

function CreateSourceSystemDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const create = useMutation({
    mutationFn: API_CreateSourceSystem,
    onSuccess: async (system) => {
      await queryClient.invalidateQueries({ queryKey: ['source-systems'] })
      toast.success(`Đã đăng ký hệ thống nguồn “${system.source_name}”.`)
      setOpen(false)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!create.isPending) {
          create.reset()
          setOpen(next)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Đăng ký hệ thống nguồn</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Đăng ký hệ thống nguồn</DialogTitle>
        <DialogDescription>
          Hệ thống đã đăng ký sẽ xuất hiện khi thêm nguồn kết nối hoặc tạo bộ dữ liệu Bronze.
        </DialogDescription>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (create.isPending) return
            const data = new FormData(event.currentTarget)
            const sourceCode = (data.get('code') as string).trim()
            const sourceName = (data.get('name') as string).trim()
            if (!sourceCode || !sourceName) return
            create.mutate({
              source_code: sourceCode,
              source_name: sourceName,
              source_type: data.get('type') as string,
              description: (data.get('description') as string).trim() || undefined,
            })
          }}
        >
          <label className="grid gap-1 text-sm font-medium">
            Mã hệ thống
            <input name="code" className={selectClass} required maxLength={50} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Tên hệ thống
            <input name="name" className={selectClass} required maxLength={200} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Loại hệ thống
            <select name="type" className={selectClass}>
              <option value="DATABASE">Cơ sở dữ liệu</option>
              <option value="FILE">Tệp hoặc kho lưu trữ</option>
              <option value="API">API</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Mô tả
            <textarea
              name="description"
              rows={3}
              maxLength={4000}
              className="rounded-md border p-2 text-sm"
            />
          </label>
          {create.isError && (
            <p role="alert" className="text-xs text-rose-700">
              {getApiErrorMessage(create.error, 'Không đăng ký được hệ thống nguồn.')}
            </p>
          )}
          <Button type="submit" variant="primary" loading={create.isPending}>
            Đăng ký
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function SourcesView() {
  const queryClient = useQueryClient()
  const [systemId, setSystemId] = useState('')
  const [sourceType, setSourceType] = useState('')
  const [status, setStatus] = useState<DataSourceStatusFilter>('all')
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

  const sourceSystemOptions = (sourceSystemsQuery.data ?? []).map((sys) => ({
    id: sys.source_system_id,
    name: sys.source_name,
  }))

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
          <>
            <CreateSourceSystemDialog />
            <Link
              href="/data/sources/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#b91830] px-3 text-xs font-semibold text-white hover:bg-[#9e1429]"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Thêm nguồn dữ liệu
            </Link>
          </>
        }
      />

      <div className={filterBarClassName}>
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
            className={`${filterControlClassName} w-56 pl-8`}
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="sr-only">Hệ thống nguồn:</span>
          <select
            className={filterControlClassName}
            value={systemId}
            onChange={(event) => resetPage(setSystemId)(event.target.value)}
          >
            <option value="">Tất cả hệ thống nguồn</option>
            {sourceSystemOptions.map((system) => (
              <option key={system.id} value={system.id}>
                {system.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="sr-only">Loại nguồn:</span>
          <select
            className={filterControlClassName}
            value={sourceType}
            onChange={(event) => resetPage(setSourceType)(event.target.value)}
          >
            <option value="">Tất cả loại nguồn</option>
            {SOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="sr-only">Trạng thái:</span>
          <select
            className={filterControlClassName}
            value={status}
            onChange={(event) => resetPage(setStatus)(event.target.value as DataSourceStatusFilter)}
          >
            <option value="all">Tất cả trạng thái</option>
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
          <TableSkeleton columns={8} />
        ) : list.isError ? (
          <div className="p-4">
            <ErrorState
              message={getApiErrorMessage(list.error, 'Không tải được danh sách nguồn dữ liệu.')}
              retrying={list.isFetching}
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
                      className={`align-top ${isSelected ? 'bg-[#fff3f5]/50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSourceId(isSelected ? null : source.data_source_id)
                          }
                          className="text-left font-semibold text-[#a9162e] hover:underline"
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
                          className="inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold text-[#a9162e] hover:bg-[#fff3f5]"
                          aria-label={`Sửa nguồn ${source.source_name}`}
                        >
                          Sửa
                        </Link>
                        <Button
                          variant="ghost"
                          loading={
                            toggle.isPending &&
                            toggle.variables?.data_source_id === source.data_source_id
                          }
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
              retrying={detailQuery.isFetching}
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
