'use client'

import { useState } from 'react'

import Link from 'next/link'

import { Sparkles } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, MockNotice, PageHeader, Tag } from '@/components/page/page-parts'
import { cn } from '@/lib/utils'

import { MAJOR_COMPARISON, formatGrowth, growthPercent } from './dashboard-data'

type SortKey = 'current' | 'growth'

export function AnalyticsCompareView({ askHref }: { askHref: string }) {
  const [sortKey, setSortKey] = useState<SortKey>('current')

  const rows = MAJOR_COMPARISON.map((row) => ({
    ...row,
    change: row.current - row.previous,
    growth: growthPercent(row.previous, row.current),
  })).sort((a, b) =>
    sortKey === 'current' ? b.current - a.current : (b.growth ?? 0) - (a.growth ?? 0)
  )

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Tuyển sinh', 'Phân tích & So sánh']}
        title="Phân tích & So sánh"
        description="So sánh chỉ số tuyển sinh theo ngành giữa hai kỳ."
        actions={
          <Link
            href={askHref}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            Hỏi AI về dữ liệu này
          </Link>
        }
      />
      <MockNotice api="GET /dashboard/admissions/breakdown" />

      <Card
        title="So sánh số nhập học theo ngành"
        subtitle="2026 so với cùng kỳ năm trước (2025)"
        right={<Tag tone="indigo">{rows.length} nhóm</Tag>}
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="major" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="previous" name="2025" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="current" name="2026" fill="#4f46e5" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card
        title="Bảng tổng hợp biến động"
        subtitle="Số tuyệt đối và mức tăng giảm"
        right={
          <div role="group" aria-label="Sắp xếp" className="flex gap-1">
            {(
              [
                ['current', 'Theo số nhập học'],
                ['growth', 'Theo tăng trưởng'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={sortKey === key}
                onClick={() => setSortKey(key)}
                className={cn(
                  'rounded px-2 py-1 text-[11px] font-medium',
                  sortKey === key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                {['Ngành', '2025', '2026', 'Biến động', 'Tăng trưởng'].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.major}>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-slate-900">{row.major}</p>
                    <p className="text-[11px] text-slate-500">{row.group}</p>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-700">{row.previous}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-700">{row.current}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-700">
                    {row.change > 0 ? `+${row.change}` : row.change}
                  </td>
                  <td className="px-3 py-2.5">
                    <Tag tone={(row.growth ?? 0) >= 0 ? 'emerald' : 'rose'}>
                      {formatGrowth(row.growth)}
                    </Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
