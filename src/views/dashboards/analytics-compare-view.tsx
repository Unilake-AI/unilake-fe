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

import {
  Card,
  EmptyState,
  KpiCard,
  MockNotice,
  PageHeader,
  Tag,
  formatNumber,
} from '@/components/page/page-parts'
import { useDomain } from '@/hooks/use-domain'
import { cn } from '@/lib/utils'
import type { AnalyticsComparisonSortKey } from '@/types/analytics-comparison'

import { MAJOR_COMPARISON, formatGrowth, growthPercent } from './dashboard-data'

export function AnalyticsCompareView({ askHref }: { askHref: string }) {
  const [sortKey, setSortKey] = useState<AnalyticsComparisonSortKey>('current')
  const { domain } = useDomain()

  const rows = MAJOR_COMPARISON.map((row) => ({
    ...row,
    change: row.current - row.previous,
    growth: growthPercent(row.previous, row.current),
  })).sort((a, b) =>
    sortKey === 'current' ? b.current - a.current : (b.growth ?? 0) - (a.growth ?? 0)
  )
  const previousTotal = rows.reduce((total, row) => total + row.previous, 0)
  const currentTotal = rows.reduce((total, row) => total + row.current, 0)
  const change = currentTotal - previousTotal
  const improvingMajors = rows.filter((row) => row.change > 0).length

  if (domain.code !== 'all' && domain.code !== 'admissions') {
    return (
      <div className="space-y-5">
        <PageHeader
          breadcrumb={[domain.shortLabel, 'Phân tích & So sánh']}
          title={`Phân tích & So sánh — ${domain.shortLabel}`}
        />
        <Card>
          <EmptyState
            title="Chưa có báo cáo so sánh cho phân hệ này"
            description="Báo cáo so sánh đang được chuẩn bị cho phân hệ của bạn."
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Tuyển sinh', 'Phân tích & So sánh']}
        title="Phân tích & So sánh"
        description="So sánh chỉ số tuyển sinh theo ngành giữa hai kỳ."
        actions={
          <Link
            href={askHref}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#ebc5cd] bg-[#fff3f5] px-3 text-xs font-semibold text-[#a9162e] hover:bg-[#fbe4e9]"
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            Hỏi AI về dữ liệu này
          </Link>
        }
      />
      <MockNotice />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Nhập học kỳ trước" value={formatNumber(previousTotal)} hint="Năm 2025" />
        <KpiCard
          label="Nhập học kỳ hiện tại"
          value={formatNumber(currentTotal)}
          hint="Năm 2026"
          tone="indigo"
        />
        <KpiCard
          label="Biến động toàn bộ"
          value={`${change > 0 ? '+' : ''}${formatNumber(change)}`}
          hint={formatGrowth(growthPercent(previousTotal, currentTotal))}
          tone={change >= 0 ? 'emerald' : 'rose'}
        />
        <KpiCard
          label="Ngành tăng trưởng"
          value={`${improvingMajors}/${rows.length}`}
          hint="So với cùng kỳ"
          tone="sky"
        />
      </div>

      <Card
        title="So sánh số nhập học theo ngành"
        subtitle="2026 so với cùng kỳ năm trước (2025)"
        right={<Tag tone="indigo">{rows.length} nhóm</Tag>}
        bodyClassName="px-3 pb-5 pt-6 sm:px-5"
      >
        <p className="mb-3 text-xs text-[#65718d] sm:hidden">Vuốt ngang để xem toàn bộ ngành.</p>
        <div className="overflow-x-auto pb-1">
          <div className="h-72 min-w-[620px] sm:h-80 sm:min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 8, right: 10, left: -16, bottom: 12 }}>
                <CartesianGrid stroke="#e5e9f4" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="major"
                  tick={{ fontSize: 10, fill: '#596884' }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={62}
                />
                <YAxis tick={{ fontSize: 11, fill: '#596884' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: '#dfe4f2',
                    boxShadow: '0 12px 30px rgba(20,33,66,.1)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="previous" name="2025" fill="#c9d0e5" radius={[5, 5, 0, 0]} />
                <Bar dataKey="current" name="2026" fill="#514cf2" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
                  sortKey === key ? 'bg-[#b91830] text-white' : 'text-slate-600 hover:bg-slate-100'
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
