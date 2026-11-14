'use client'

import { useState } from 'react'

import { Card, KpiCard, MockNotice, PageHeader, Tag } from '@/components/page/page-parts'
import type { LogLevel } from '@/types/audit-logs'
import type { StatusTone } from '@/types/page/page-parts'

const LEVEL_LABEL: Record<LogLevel, string> = { INFO: 'Thông tin', WARN: 'Cảnh báo', ERROR: 'Lỗi' }

const LEVEL_TONE: Record<LogLevel, StatusTone> = { INFO: 'sky', WARN: 'amber', ERROR: 'rose' }

const LOGS: {
  time: string
  level: LogLevel
  module: string
  user: string
  message: string
  requestId: string
}[] = [
  {
    time: '2026-10-06 07:05:12',
    level: 'INFO',
    module: 'Hỏi AI',
    user: 'phuong.ttm',
    message: 'Đã trả lời câu hỏi.',
    requestId: 'req_01J8AI01',
  },
  {
    time: '2026-10-06 07:04:58',
    level: 'INFO',
    module: 'Đăng nhập',
    user: 'phuong.ttm',
    message: 'Đăng nhập thành công.',
    requestId: 'req_01J8AUTH01',
  },
  {
    time: '2026-10-06 06:48:03',
    level: 'WARN',
    module: 'Hỏi AI',
    user: 'hung.nv',
    message: 'Yêu cầu bị chặn vì có thể thay đổi dữ liệu.',
    requestId: 'req_01J8AI03',
  },
  {
    time: '2026-10-06 02:01:10',
    level: 'ERROR',
    module: 'Nạp dữ liệu',
    user: 'Hệ thống',
    message: 'Không nạp được dữ liệu vì nguồn phản hồi quá chậm.',
    requestId: 'req_01J8ING47',
  },
  {
    time: '2026-10-06 01:00:00',
    level: 'INFO',
    module: 'Nạp dữ liệu',
    user: 'Hệ thống',
    message: 'Đã bắt đầu nạp dữ liệu tuyển sinh.',
    requestId: 'req_01J8ING48',
  },
  {
    time: '2026-10-05 22:15:41',
    level: 'WARN',
    module: 'Đăng nhập',
    user: 'lien.vtm',
    message: 'Không thể đăng nhập vì tài khoản đã bị khóa.',
    requestId: 'req_01J8AUTH03',
  },
]

export function LogsView() {
  const [level, setLevel] = useState<LogLevel | ''>('')
  const rows = LOGS.filter((log) => !level || log.level === level)

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị hệ thống', 'Nhật ký hệ thống']}
        title="Nhật ký hệ thống & Kiểm toán"
        description="Xem các hoạt động, cảnh báo và sự cố đã được ghi lại."
      />
      <MockNotice />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Sự kiện 24 giờ" value="1.284" />
        <KpiCard label="Lỗi" value="0,5%" tone="rose" hint="6 sự kiện" />
        <KpiCard label="Cảnh báo" value="1,8%" tone="amber" hint="23 sự kiện" />
        <KpiCard
          label="Thời gian phản hồi TB"
          value="412 ms"
          hint="Mục tiêu < 5 giây"
          tone="emerald"
        />
      </div>

      <Card
        title="Các sự kiện đã ghi"
        subtitle="Mới nhất trước"
        right={
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            Mức:
            <select
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800"
              value={level}
              onChange={(event) => setLevel(event.target.value as LogLevel | '')}
            >
              <option value="">Tất cả</option>
              <option value="INFO">{LEVEL_LABEL.INFO}</option>
              <option value="WARN">{LEVEL_LABEL.WARN}</option>
              <option value="ERROR">{LEVEL_LABEL.ERROR}</option>
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
                  'Khu vực',
                  'Người dùng',
                  'Hành động / Thông báo',
                  'Mã sự kiện',
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
                    <Tag tone={LEVEL_TONE[log.level]}>{LEVEL_LABEL[log.level]}</Tag>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-600">{log.module}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-600">{log.user}</td>
                  <td className="px-3 py-2.5 text-slate-800">{log.message}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-[#a9162e]">
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
