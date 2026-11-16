'use client'

import { Fragment, useEffect, useState } from 'react'

import Link from 'next/link'

import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'

import robotHistory from '@/assets/dashboard/ai-robot-history.webp'
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Tag,
  statusLabel,
  statusTone,
} from '@/components/page/page-parts'
import { getDomain } from '@/config/domains'
import { useDomain } from '@/hooks/use-domain'
import { clearQueryHistory, readQueryHistory } from '@/lib/query-history'
import type { QueryHistoryEntry } from '@/types/query-history'

export function QueryHistoryView({ askHref }: { askHref: string }) {
  const { domain } = useDomain()
  const [entries, setEntries] = useState<QueryHistoryEntry[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [period, setPeriod] = useState('all')

  useEffect(() => {
    setEntries(readQueryHistory())
  }, [])

  function clearAll() {
    clearQueryHistory()
    setEntries([])
  }

  const now = Date.now()
  const filteredEntries = entries.filter((entry) => {
    if (
      search &&
      !entry.question.toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN'))
    )
      return false
    if (status !== 'all' && entry.status !== status) return false
    if (period === '7d' && now - new Date(entry.askedAt).getTime() > 7 * 86400000) return false
    if (period === '30d' && now - new Date(entry.askedAt).getTime() > 30 * 86400000) return false
    return true
  })

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[getDomain(domain.code).shortLabel, 'Lịch sử truy vấn']}
        title="Lịch sử truy vấn"
        description="Xem lại các câu hỏi đã gửi và kết quả truy vấn trước đó."
        illustration={robotHistory}
      />
      <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-600">
        Lịch sử chỉ được lưu trên trình duyệt bạn đang dùng.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Tổng số truy vấn',
            value: entries.length,
            icon: MessageSquare,
            color: 'text-[#5146e7] bg-[#eeeeff]',
          },
          {
            label: 'Có kết quả',
            value: entries.filter((entry) => entry.status === 'COMPLETED').length,
            icon: CheckCircle2,
            color: 'text-[#15913a] bg-[#e5f8ea]',
          },
          {
            label: 'Không có kết quả',
            value: entries.filter((entry) => entry.status === 'NO_DATA').length,
            icon: Clock3,
            color: 'text-[#df8500] bg-[#fff3df]',
          },
          {
            label: 'Lỗi truy vấn',
            value: entries.filter((entry) => entry.status === 'FAILED').length,
            icon: CircleAlert,
            color: 'text-[#c51c3d] bg-[#fce8ee]',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-2xl border border-[#dfe4f2] bg-white p-5 shadow-[0_8px_24px_rgba(31,43,83,.055)]"
          >
            <span className={`flex size-12 items-center justify-center rounded-full ${color}`}>
              <Icon className="size-6" />
            </span>
            <div>
              <strong className="text-2xl text-[#111a35]">{value}</strong>
              <p className="text-xs text-[#596884]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#dfe4f2] bg-white p-4">
        <label className="flex min-w-52 flex-1 items-center gap-2 rounded-lg border border-[#cbd4e3] px-3">
          <Search className="size-4 text-[#65718d]" />
          <span className="sr-only">Tìm kiếm câu hỏi</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm kiếm câu hỏi…"
            className="h-10 min-w-0 flex-1 text-sm outline-none"
          />
        </label>
        <label className="sr-only" htmlFor="history-period">
          Khoảng thời gian
        </label>
        <select
          id="history-period"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="h-10 rounded-lg border border-[#cbd4e3] bg-white px-3 text-sm"
        >
          <option value="all">Tất cả thời gian</option>
          <option value="7d">7 ngày qua</option>
          <option value="30d">30 ngày qua</option>
        </select>
        <label className="sr-only" htmlFor="history-status">
          Trạng thái
        </label>
        <select
          id="history-status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded-lg border border-[#cbd4e3] bg-white px-3 text-sm"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="COMPLETED">Có kết quả</option>
          <option value="NO_DATA">Không có kết quả</option>
          <option value="FAILED">Lỗi truy vấn</option>
        </select>
        <Button
          onClick={() => setEntries(readQueryHistory())}
          icon={<RefreshCw className="size-4" />}
        >
          Làm mới
        </Button>
        {entries.length > 0 && (
          <Button onClick={clearAll} icon={<Trash2 className="size-4" />}>
            Xoá lịch sử trên máy này
          </Button>
        )}
      </div>

      <Card
        title={`${filteredEntries.length} truy vấn`}
        subtitle="Sắp xếp theo thời gian mới nhất trên trình duyệt này"
        bodyClassName="p-0"
      >
        {filteredEntries.length === 0 ? (
          <div className="pb-6">
            <EmptyState
              title={entries.length ? 'Không có truy vấn phù hợp' : 'Chưa có truy vấn nào'}
              description={
                entries.length
                  ? 'Thử thay đổi từ khóa hoặc bộ lọc.'
                  : 'Các câu hỏi bạn gửi ở trang Hỏi AI sẽ hiện ở đây.'
              }
            />
            <div className="text-center">
              <Link
                href={askHref}
                className="text-xs font-semibold text-indigo-700 hover:underline"
              >
                Đến trang Hỏi AI
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[#f0f2ff] text-xs font-semibold text-[#34415f]">
                <tr>
                  {['Câu hỏi', 'Trạng thái', 'Số dòng', 'Thời gian chạy', 'Lúc', ''].map((head) => (
                    <th key={head} scope="col" className="px-3 py-2 font-medium">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((entry) => (
                  <Fragment key={entry.id}>
                    <tr>
                      <td className="max-w-[360px] px-3 py-2.5 font-medium text-slate-900">
                        {entry.question}
                      </td>
                      <td className="px-3 py-2.5">
                        <Tag tone={statusTone(entry.status)}>{statusLabel(entry.status)}</Tag>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">{entry.rowCount}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">
                        {entry.durationMs ? `${entry.durationMs.toLocaleString('vi-VN')} ms` : '—'}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">
                        {new Date(entry.askedAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {(entry.sql ?? entry.error) && (
                          <button
                            type="button"
                            className="text-xs font-semibold text-indigo-700 hover:underline"
                            aria-expanded={expanded === entry.id}
                            onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                          >
                            {expanded === entry.id ? 'Ẩn' : entry.sql ? 'Xem SQL' : 'Xem lỗi'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === entry.id && (
                      <tr>
                        <td colSpan={6} className="bg-slate-50 px-3 py-2.5">
                          {entry.sql ? (
                            <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 font-mono text-[11px] text-emerald-300">
                              {entry.sql}
                            </pre>
                          ) : (
                            <p className="text-xs text-rose-700">
                              Câu hỏi này chưa có câu trả lời. Bạn có thể gửi lại ở trang Hỏi AI.
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
