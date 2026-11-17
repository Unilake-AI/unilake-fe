'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { EmptyState, formatNumber } from '@/components/page/page-parts'

const COUNT_COLORS = {
  neutral: '#334f72',
  warning: '#a55b09',
  success: '#1e7858',
  error: '#ac2b47',
}

export interface CountCategory {
  label: string
  count: number
  tone?: keyof typeof COUNT_COLORS
}

export function CountChart({ data, unit }: { data: CountCategory[]; unit: string }) {
  if (data.length < 2 || !data.some(({ count }) => count > 0)) {
    return <EmptyState title="Chưa đủ dữ liệu để so sánh" />
  }

  return (
    <figure className="min-w-0">
      <figcaption className="sr-only">
        {data.map(({ label, count }) => `${label}: ${formatNumber(count)} ${unit}`).join('. ')}
      </figcaption>
      <div className="w-full min-w-0" style={{ height: Math.max(180, 46 * data.length + 51) }}>
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 320, height: 180 }}
        >
          <BarChart layout="vertical" data={data} margin={{ right: 42 }}>
            <CartesianGrid horizontal={false} stroke="#dbe4ef" strokeDasharray="3 4" />
            <XAxis
              type="number"
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#475569' }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={102}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#334155' }}
            />
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              formatter={(value) => [`${formatNumber(Number(value))} ${unit}`, 'Số lượng']}
            />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="count"
              name={`Số ${unit}`}
              fill={COUNT_COLORS.neutral}
              barSize={18}
              radius={[0, 5, 5, 0]}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="count"
                position="right"
                fill="#192438"
                fontSize={11}
                fontWeight={600}
                formatter={(value) => formatNumber(Number(value))}
              />
              {data.map(({ label, tone = 'neutral' }) => (
                <Cell key={label} fill={COUNT_COLORS[tone]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
