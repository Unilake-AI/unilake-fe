'use client'

import { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'

import { API_GetCatalog } from '@/api/api_data'
import { getApiErrorMessage, getApiRequestId } from '@/api/http'
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Tag,
  statusTone,
} from '@/components/page/page-parts'
import { cn } from '@/lib/utils'
import type { CatalogEntry } from '@/types/data'

function entryKey(entry: CatalogEntry): string {
  return `${entry.domain_id}.${entry.layer}.${entry.dataset}`
}

/** Lọc dataset theo tên, mô tả hoặc tên cột (không phân biệt hoa thường). */
export function filterCatalog(entries: CatalogEntry[], keyword: string): CatalogEntry[] {
  const q = keyword.trim().toLowerCase()
  if (!q) {
    return entries
  }
  return entries.filter(
    (entry) =>
      entry.dataset.toLowerCase().includes(q) ||
      entry.description.toLowerCase().includes(q) ||
      entry.fields.some((field) => field.name.toLowerCase().includes(q))
  )
}

export function CatalogView() {
  const [keyword, setKeyword] = useState('')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const catalog = useQuery({ queryKey: ['catalog'], queryFn: () => API_GetCatalog() })

  const entries = useMemo(() => filterCatalog(catalog.data ?? [], keyword), [catalog.data, keyword])
  const selected = entries.find((entry) => entryKey(entry) === selectedKey) ?? entries[0]
  const layers = new Set((catalog.data ?? []).map((entry) => entry.layer)).size

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Data Catalog']}
        title="Data Catalog — Từ điển dữ liệu & Schema"
        description="Metadata của dataset, bảng và cột: tên, kiểu dữ liệu, mô tả, nguồn. Nguồn: GET /api/v1/governance/catalog."
      />

      {catalog.isPending ? (
        <LoadingState />
      ) : catalog.isError ? (
        <ErrorState
          requestId={getApiRequestId(catalog.error)}
          message={getApiErrorMessage(catalog.error, 'Không tải được Data Catalog.')}
          onRetry={() => void catalog.refetch()}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card
            title="Dataset"
            subtitle={`${catalog.data.length} dataset · ${layers} tầng`}
            bodyClassName="space-y-3"
          >
            <label className="relative block">
              <span className="sr-only">Tìm dataset, bảng, cột</span>
              <Search
                className="absolute left-2.5 top-2.5 size-3.5 text-slate-400"
                aria-hidden="true"
              />
              <input
                className="h-8 w-full rounded-md border border-slate-300 pl-8 pr-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                placeholder="Tìm dataset, bảng, cột…"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </label>
            {entries.length === 0 ? (
              <EmptyState title="Không có dataset khớp" />
            ) : (
              <ul className="space-y-1.5">
                {entries.map((entry) => {
                  const active = selected && entryKey(entry) === entryKey(selected)
                  return (
                    <li key={entryKey(entry)}>
                      <button
                        type="button"
                        onClick={() => setSelectedKey(entryKey(entry))}
                        aria-pressed={active}
                        className={cn(
                          'flex w-full items-start justify-between gap-2 rounded-md border px-3 py-2 text-left',
                          active
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-slate-900">
                            {entry.dataset}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {entry.domain_id} · v{entry.schema_version}
                          </span>
                        </span>
                        <Tag tone={statusTone(entry.layer)}>{entry.layer}</Tag>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {selected ? (
            <Card
              title={selected.dataset}
              subtitle={selected.description || 'Chưa có mô tả'}
              right={<Tag tone={statusTone(selected.layer)}>{selected.layer}</Tag>}
              bodyClassName="p-0"
            >
              <div className="grid grid-cols-3 border-b border-slate-200 text-xs">
                {[
                  ['Domain', selected.domain_id],
                  ['Phiên bản schema', selected.schema_version],
                  ['Số cột', String(selected.fields.length)],
                ].map(([label, value]) => (
                  <div key={label} className="px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                      {label}
                    </p>
                    <p className="mt-0.5 font-mono font-semibold text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      {['Cột', 'Kiểu dữ liệu', 'Nullable', 'Mô tả'].map((head) => (
                        <th key={head} scope="col" className="px-4 py-2 font-medium">
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selected.fields.map((field) => (
                      <tr key={field.name}>
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">
                          {field.name}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-indigo-700">{field.data_type}</td>
                        <td className="px-4 py-2.5">
                          <Tag tone={field.nullable ? 'amber' : 'slate'}>
                            {field.nullable ? 'NULL' : 'NOT NULL'}
                          </Tag>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{field.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card>
              <EmptyState
                title="Catalog chưa có dataset"
                description="Backend chưa đăng ký dataset nào cho domain này."
              />
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
