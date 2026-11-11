'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import Link from 'next/link'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Info, Plus, RefreshCw, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  API_CreateDataset,
  API_GetDataset,
  API_ListDatasets,
  API_ListSourceSystems,
} from '@/api/admindata/datasets'
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

import { DATA_DOMAINS, domainLabel } from './data-helpers'

const PAGE_SIZE = 20

const createDatasetSchema = z.object({
  dataset_code: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mã bộ dữ liệu (dataset_code).')
    .max(100, 'Mã bộ dữ liệu tối đa 100 ký tự.'),
  dataset_name: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên bộ dữ liệu.')
    .max(200, 'Tên bộ dữ liệu tối đa 200 ký tự.'),
  domain: z.enum(['hr', 'academic', 'admissions'], {
    message: 'Vui lòng chọn lĩnh vực hợp lệ.',
  }),
  source_system_id: z.number().int().positive('Vui lòng chọn hệ thống nguồn.'),
  description: z.string().max(4000, 'Mô tả tối đa 4000 ký tự.').optional(),
})

const inputClass =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30'

function CreateDatasetPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [datasetCode, setDatasetCode] = useState('')
  const [datasetName, setDatasetName] = useState('')
  const [domain, setDomain] = useState<'hr' | 'academic' | 'admissions'>('hr')
  const [sourceSystemId, setSourceSystemId] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const systemsQuery = useQuery({
    queryKey: ['source-systems'],
    queryFn: API_ListSourceSystems,
  })

  const createMutation = useMutation({
    mutationFn: API_CreateDataset,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['datasets'] })
      toast.success(`Đã đăng ký bộ dữ liệu “${created.dataset_name}” (#${created.dataset_id}).`)
      onClose()
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (createMutation.isPending) return
    setFormError(null)
    createMutation.reset()

    const parsed = createDatasetSchema.safeParse({
      dataset_code: datasetCode,
      dataset_name: datasetName,
      domain,
      source_system_id: Number(sourceSystemId),
      description: description.trim() ? description.trim() : undefined,
    })

    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Thông tin đăng ký chưa hợp lệ.')
      return
    }

    createMutation.mutate({
      ...parsed.data,
      description: parsed.data.description ?? null,
    })
  }

  return (
    <Card
      title="Đăng ký bộ dữ liệu Bronze mới"
      subtitle="Đăng ký metadata bộ dữ liệu trong catalog để liên kết khi nạp dữ liệu"
      right={
        <Button variant="ghost" onClick={onClose} aria-label="Đóng biểu mẫu đăng ký bộ dữ liệu">
          <X className="size-4" aria-hidden="true" />
        </Button>
      }
    >
      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit} noValidate>
        <div className="space-y-1.5">
          <label htmlFor="ds-code" className="block text-xs font-semibold text-slate-700">
            Mã bộ dữ liệu (dataset_code) *
          </label>
          <input
            id="ds-code"
            className={`${inputClass} font-mono`}
            value={datasetCode}
            onChange={(e) => setDatasetCode(e.target.value)}
            placeholder="HR_EMPLOYEES"
            maxLength={100}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ds-name" className="block text-xs font-semibold text-slate-700">
            Tên bộ dữ liệu *
          </label>
          <input
            id="ds-name"
            className={inputClass}
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            placeholder="Danh sách nhân viên"
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ds-domain" className="block text-xs font-semibold text-slate-700">
            Lĩnh vực *
          </label>
          <select
            id="ds-domain"
            className={inputClass}
            value={domain}
            onChange={(e) => setDomain(e.target.value as 'hr' | 'academic' | 'admissions')}
          >
            {DATA_DOMAINS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ds-system" className="block text-xs font-semibold text-slate-700">
            Hệ thống nguồn *
          </label>
          <select
            id="ds-system"
            className={inputClass}
            value={sourceSystemId}
            onChange={(e) => setSourceSystemId(e.target.value)}
          >
            <option value="">
              {systemsQuery.isPending ? 'Đang tải hệ thống nguồn…' : 'Chọn hệ thống nguồn'}
            </option>
            {(systemsQuery.data ?? []).map((sys) => (
              <option key={sys.source_system_id} value={String(sys.source_system_id)}>
                {sys.source_name} ({sys.source_code})
              </option>
            ))}
          </select>
          {systemsQuery.isError && (
            <p className="text-[11px] text-rose-600">
              {getApiErrorMessage(systemsQuery.error, 'Không tải được danh sách hệ thống nguồn.')}
            </p>
          )}
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label htmlFor="ds-description" className="block text-xs font-semibold text-slate-700">
            Mô tả (tùy chọn)
          </label>
          <textarea
            id="ds-description"
            rows={2}
            maxLength={4000}
            className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dữ liệu nhân sự dùng cho tầng Bronze"
          />
        </div>

        {(formError || createMutation.isError) && (
          <div
            role="alert"
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 md:col-span-2"
          >
            {formError ??
              getApiErrorMessage(createMutation.error, 'Không thể đăng ký bộ dữ liệu mới.')}
          </div>
        )}

        <div className="flex justify-end gap-2 md:col-span-2">
          <Button variant="outline" onClick={onClose} disabled={createMutation.isPending}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Đang đăng ký…' : 'Đăng ký bộ dữ liệu'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export function DatasetsView() {
  const [showCreate, setShowCreate] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState<string>('')
  const [offset, setOffset] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const listQuery = useQuery({
    queryKey: [
      'datasets',
      {
        search: appliedSearch || undefined,
        domain: domainFilter || undefined,
        limit: PAGE_SIZE,
        offset,
      },
    ],
    queryFn: () =>
      API_ListDatasets({
        search: appliedSearch || undefined,
        domain: (domainFilter as 'hr' | 'academic' | 'admissions') || undefined,
        limit: PAGE_SIZE,
        offset,
      }),
  })

  const detailQuery = useQuery({
    queryKey: ['datasets', 'detail', selectedId],
    queryFn: () => API_GetDataset(selectedId!),
    enabled: selectedId !== null,
  })

  const systemsQuery = useQuery({
    queryKey: ['source-systems'],
    queryFn: API_ListSourceSystems,
  })

  const datasets = listQuery.data ?? []

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    setOffset(0)
    setAppliedSearch(searchInput.trim())
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Bộ dữ liệu (Datasets)']}
        title="Quản lý bộ dữ liệu tầng Bronze"
        description="Đăng ký và tra cứu các bộ dữ liệu Bronze đang hoạt động để phục vụ nạp dữ liệu và cấu hình Silver."
        actions={
          <>
            <Button
              onClick={() => void listQuery.refetch()}
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
            <Button
              variant="primary"
              onClick={() => setShowCreate(true)}
              icon={<Plus className="size-3.5" aria-hidden="true" />}
            >
              Đăng ký bộ dữ liệu
            </Button>
          </>
        }
      />

      <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        <Info className="mt-0.5 size-4 shrink-0 text-indigo-600" aria-hidden="true" />
        <p>
          <strong>Lưu ý kiến trúc:</strong> Đăng ký bộ dữ liệu chỉ khai báo metadata trong hệ thống,
          chưa tạo dữ liệu vật lý trên Bronze. Sau khi đăng ký, hãy vào{' '}
          <Link href="/data/ingestion" className="font-semibold text-indigo-600 hover:underline">
            Nạp dữ liệu (Ingestion)
          </Link>{' '}
          để tải tệp hoặc thu thập từ nguồn đã đăng ký.
        </p>
      </div>

      {showCreate && <CreateDatasetPanel onClose={() => setShowCreate(false)} />}

      {/* Tìm kiếm và lọc */}
      <Card>
        <form className="flex flex-wrap items-end gap-3 text-xs" onSubmit={handleSearch}>
          <div className="min-w-[220px] flex-1 space-y-1">
            <label htmlFor="datasets-search" className="block font-semibold text-slate-700">
              Tìm theo tên bộ dữ liệu
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="datasets-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Nhập tên bộ dữ liệu…"
                className={`${inputClass} pl-8`}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="datasets-domain" className="block font-semibold text-slate-700">
              Lĩnh vực
            </label>
            <select
              id="datasets-domain"
              value={domainFilter}
              onChange={(e) => {
                setDomainFilter(e.target.value)
                setOffset(0)
              }}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900"
            >
              <option value="">Tất cả lĩnh vực</option>
              {DATA_DOMAINS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" variant="outline" className="h-9">
            Tìm kiếm
          </Button>
        </form>
      </Card>

      {/* Danh sách bộ dữ liệu */}
      <Card title="Danh sách bộ dữ liệu Bronze" bodyClassName="p-0">
        {listQuery.isPending ? (
          <LoadingState label="Đang tải danh sách bộ dữ liệu…" />
        ) : listQuery.isError ? (
          <div className="p-4">
            <ErrorState
              message={getApiErrorMessage(listQuery.error, 'Không tải được danh sách bộ dữ liệu.')}
              onRetry={() => void listQuery.refetch()}
            />
          </div>
        ) : datasets.length === 0 ? (
          <EmptyState
            title="Chưa có bộ dữ liệu phù hợp"
            description="Thử từ khóa khác hoặc bấm Đăng ký bộ dữ liệu để tạo mới."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-xs">
                <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    {[
                      'ID',
                      'Mã bộ dữ liệu',
                      'Tên bộ dữ liệu',
                      'Lĩnh vực',
                      'Hệ thống nguồn',
                      'Trạng thái',
                      'Ngày tạo',
                    ].map((heading) => (
                      <th key={heading} scope="col" className="px-3 py-2 font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {datasets.map((ds) => {
                    const isSelected = selectedId === ds.dataset_id
                    const sysName = systemsQuery.data?.find(
                      (s) => s.source_system_id === ds.source_system_id
                    )?.source_name
                    return (
                      <tr
                        key={ds.dataset_id}
                        className={isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}
                      >
                        <td className="px-3 py-2.5 font-mono font-semibold text-indigo-600">
                          <button
                            type="button"
                            onClick={() => setSelectedId(isSelected ? null : ds.dataset_id)}
                            className="hover:underline"
                          >
                            #{ds.dataset_id}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-700">{ds.dataset_code}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-900">
                          <button
                            type="button"
                            onClick={() => setSelectedId(isSelected ? null : ds.dataset_id)}
                            className="text-left hover:underline"
                          >
                            {ds.dataset_name}
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <Tag tone="indigo">{domainLabel(ds.domain)}</Tag>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {sysName ?? (ds.source_system_id ? `#${ds.source_system_id}` : '—')}
                        </td>
                        <td className="px-3 py-2.5">
                          <Tag tone={statusTone(ds.status)}>{statusLabel(ds.status)}</Tag>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">
                          {formatDateTime(ds.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
              <span>
                Hiển thị {datasets.length} bộ dữ liệu (từ vị trí {offset + 1})
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  disabled={offset === 0 || listQuery.isFetching}
                  onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                  icon={<ChevronLeft className="size-3.5" aria-hidden="true" />}
                >
                  Trang trước
                </Button>
                <Button
                  disabled={datasets.length < PAGE_SIZE || listQuery.isFetching}
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

      {/* Chi tiết bộ dữ liệu */}
      {selectedId !== null && (
        <Card
          title={`Chi tiết bộ dữ liệu #${selectedId}`}
          right={
            <Button variant="ghost" onClick={() => setSelectedId(null)}>
              Đóng
            </Button>
          }
        >
          {detailQuery.isPending ? (
            <LoadingState />
          ) : detailQuery.isError ? (
            <ErrorState
              message={getApiErrorMessage(detailQuery.error, 'Không tải được chi tiết bộ dữ liệu.')}
              onRetry={() => void detailQuery.refetch()}
            />
          ) : (
            <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-slate-500">Mã bộ dữ liệu</dt>
                <dd className="mt-0.5 font-mono font-semibold text-slate-900">
                  {detailQuery.data.dataset_code}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Tên bộ dữ liệu</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">
                  {detailQuery.data.dataset_name}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Lĩnh vực</dt>
                <dd className="mt-0.5">{domainLabel(detailQuery.data.domain)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Định dạng lưu trữ / Phiên bản</dt>
                <dd className="mt-0.5 font-mono text-slate-900">
                  {detailQuery.data.storage_format ?? '—'} · {detailQuery.data.version ?? '—'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Vị trí lưu trữ</dt>
                <dd className="mt-0.5 break-all font-mono text-slate-900">
                  {detailQuery.data.location ?? 'Chưa có dữ liệu Bronze'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Ngày tạo</dt>
                <dd className="mt-0.5 text-slate-900">
                  {formatDateTime(detailQuery.data.created_at)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Cập nhật</dt>
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
