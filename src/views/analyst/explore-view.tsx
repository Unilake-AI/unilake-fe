'use client'

import { useState } from 'react'

import { useQuery } from '@tanstack/react-query'

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

const LAYERS = ['all', 'gold', 'silver', 'bronze'] as const

export function ExploreView() {
  const [layer, setLayer] = useState<(typeof LAYERS)[number]>('all')
  const [selected, setSelected] = useState<string | null>(null)

  const catalog = useQuery({ queryKey: ['catalog'], queryFn: () => API_GetCatalog() })
  const entries = (catalog.data ?? []).filter(
    (entry) => layer === 'all' || entry.layer.toLowerCase() === layer
  )
  const current =
    entries.find((entry) => `${entry.layer}.${entry.dataset}` === selected) ?? entries[0]

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Phân tích', 'Khám phá dữ liệu']}
        title="Khám phá dữ liệu"
        description="Xem danh sách dataset trong Data Lake và cấu trúc cột (chỉ đọc). Nguồn: GET /api/v1/governance/catalog."
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        Tầng dữ liệu:
        {LAYERS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={layer === item}
            onClick={() => setLayer(item)}
            className={cn(
              'rounded-md border px-2.5 py-1 font-medium uppercase',
              layer === item
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            )}
          >
            {item === 'all' ? 'Tất cả' : item}
          </button>
        ))}
      </div>

      {catalog.isPending ? (
        <LoadingState />
      ) : catalog.isError ? (
        <ErrorState
          requestId={getApiRequestId(catalog.error)}
          message={getApiErrorMessage(catalog.error, 'Không tải được danh sách dataset.')}
          onRetry={() => void catalog.refetch()}
        />
      ) : entries.length === 0 ? (
        <Card>
          <EmptyState title="Không có dataset khớp bộ lọc" />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <Card title="Dataset" subtitle={`${entries.length} dataset khớp bộ lọc`}>
            <ul className="space-y-1.5">
              {entries.map((entry) => {
                const key = `${entry.layer}.${entry.dataset}`
                const active = current && key === `${current.layer}.${current.dataset}`
                return (
                  <li key={key}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelected(key)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left',
                        active
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      <span className="truncate text-xs font-semibold text-slate-900">
                        {entry.dataset}
                      </span>
                      <Tag tone={statusTone(entry.layer)}>{entry.layer}</Tag>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
          {current && (
            <Card
              title={current.dataset}
              subtitle={current.description || 'Cấu trúc cột của dataset'}
              right={<Tag tone="slate">READ-ONLY</Tag>}
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      {['Cột', 'Kiểu dữ liệu', 'Mô tả'].map((h) => (
                        <th key={h} scope="col" className="px-4 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {current.fields.map((field) => (
                      <tr key={field.name}>
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">
                          {field.name}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-indigo-700">{field.data_type}</td>
                        <td className="px-4 py-2.5 text-slate-600">{field.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500">
                Xem trước bản ghi (đã che PII) sẽ có khi backend mở API preview dataset.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
