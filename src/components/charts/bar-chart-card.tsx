'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatNumber } from '@/components/page/page-parts'
import type { BarChartRow } from '@/types/charts/bar-chart-card'

export function BarChartCard({ data }: { data: BarChartRow[] }) {
  return (
    <div className="h-60 w-full min-w-0">
      <ResponsiveContainer minWidth={0} initialDimension={{ width: 320, height: 240 }}>
        <BarChart data={data} margin={{ top: 22, right: 6, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="4 4" />
          <XAxis
            dataKey="label"
            interval={0}
            tickLine={false}
            tickMargin={8}
            tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            allowDecimals={false}
            domain={[0, (maximum: number) => Math.max(1, maximum)]}
            width="auto"
            axisLine={false}
            tickLine={false}
            tickFormatter={formatNumber}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            }}
            itemStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value) => [formatNumber(Number(value)), 'Số lượt']}
          />
          <Bar
            dataKey="value"
            fill="hsl(var(--chart-1))"
            maxBarSize={64}
            radius={[6, 6, 0, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="value"
              position="top"
              fill="hsl(var(--foreground))"
              fontSize={12}
              fontWeight={600}
              formatter={(value) => formatNumber(Number(value))}
            />
            {data.map(({ label, color }) => (
              <Cell key={label} fill={color ?? 'hsl(var(--chart-1))'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
