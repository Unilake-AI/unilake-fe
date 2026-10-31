'use client'

import { useState } from 'react'

import { Card, KpiCard, MockNotice, PageHeader, Tag } from '@/components/page/page-parts'
import type { Tone } from '@/components/page/page-parts'

type Level = 'INFO' | 'WARN' | 'ERROR'

const LEVEL_TONE: Record<Level, Tone> = { INFO: 'sky', WARN: 'amber', ERROR: 'rose' }

const LOGS: {
  time: string
  level: Level
  module: string
  user: string
  message: string
  requestId: string
}[] = [
  {
    time: '2026-10-06 07:05:12',
    level: 'INFO',
    module: 'nlq',
    user: 'phuong.ttm',
    message: 'POST /nlq/ask → completed (1.420 ms)',
    requestId: 'req_01J8AI01',
  },
  {
    time: '2026-10-06 07:04:58',
    level: 'INFO',
    module: 'auth',
    user: 'phuong.ttm',
    message: 'POST /auth/login → 200',
    requestId: 'req_01J8AUTH01',
  },
  {
    time: '2026-10-06 06:48:03',
    level: 'WARN',
    module: 'nlq',
    user: 'hung.nv',
    message: 'SQL validation failed: non-SELECT statement blocked',
    requestId: 'req_01J8AI03',
  },
  {
    time: '2026-10-06 02:01:10',
    level: 'ERROR',
    module: 'ingestion',
    user: 'system',
    message: 'Job #147 failed: upstream timeout after 30s',
    requestId: 'req_01J8ING47',
  },
  {
    time: '2026-10-06 01:00:00',
    level: 'INFO',
    module: 'ingestion',
    user: 'system',
    message: 'Job #148 started: Admissions DB (PostgreSQL)',
    requestId: 'req_01J8ING48',
  },
  {
    time: '2026-10-05 22:15:41',
    level: 'WARN',
    module: 'auth',
    user: 'lien.vtm',
    message: 'POST /auth/login → 403 (account locked)',
    requestId: 'req_01J8AUTH03',
  },
]

export function LogsView() {
  const [level, setLevel] = useState<Level | ''>('')
  const rows = LOGS.filter((log) => !level || log.level === level)

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị hệ thống', 'Nhật ký hệ thống']}
        title="Nhật ký hệ thống & Kiểm toán"
        description="Ghi nhận hoạt động và lỗi quan trọng để giám sát, kiểm tra và xử lý sự cố (FR24, NFR08). Tra theo request_id."
      />
      <MockNotice api="GET /admin/logs" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Sự kiện 24 giờ" value="1.284" />
        <KpiCard label="Lỗi (ERROR)" value="0,5%" tone="rose" hint="6 sự kiện" />
        <KpiCard label="Cảnh báo (WARN)" value="1,8%" tone="amber" hint="23 sự kiện" />
        <KpiCard
          label="Thời gian phản hồi TB"
          value="412 ms"
          hint="Mục tiêu < 5 giây"
          tone="emerald"
        />
      </div>

      <Card
        title="Dòng log"
        subtitle="Mới nhất trước"
        right={
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            Mức:
            <select
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800"
              value={level}
              onChange={(event) => setLevel(event.target.value as Level | '')}
            >
              <option value="">Tất cả</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
          </label>
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                {[
                  'Thời gian',
                  'Mức',
                  'Module',
                  'Người dùng',
                  'Hành động / Thông báo',
                  'request_id',
                ].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((log) => (
                <tr key={log.requestId}>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">{log.time}</td>
                  <td className="px-3 py-2.5">
                    <Tag tone={LEVEL_TONE[log.level]}>{log.level}</Tag>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-600">{log.module}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-600">{log.user}</td>
                  <td className="px-3 py-2.5 text-slate-800">{log.message}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-indigo-700">
                    {log.requestId}
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
