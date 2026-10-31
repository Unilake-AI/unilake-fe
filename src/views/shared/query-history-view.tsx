'use client'

import { Fragment, useEffect, useState } from 'react'

import Link from 'next/link'

import { Trash2 } from 'lucide-react'

import { Button, Card, EmptyState, PageHeader, Tag, statusTone } from '@/components/page/page-parts'
import { getDomain } from '@/config/domains'
import { useDomain } from '@/hooks/use-domain'
import { clearQueryHistory, readQueryHistory } from '@/lib/query-history'
import type { QueryHistoryEntry } from '@/lib/query-history'

export function QueryHistoryView({ askHref }: { askHref: string }) {
  const { domain } = useDomain()
  const [entries, setEntries] = useState<QueryHistoryEntry[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    setEntries(readQueryHistory())
  }, [])

  function clearAll() {
    clearQueryHistory()
    setEntries([])
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[getDomain(domain.code).shortLabel, 'Lịch sử truy vấn']}
        title="Lịch sử truy vấn"
        description="Xem lại câu hỏi, SQL đã sinh và kết quả trước đó."
        actions={
          entries.length > 0 && (
            <Button onClick={clearAll} icon={<Trash2 className="size-3.5" aria-hidden="true" />}>
              Xoá lịch sử trên máy này
            </Button>
          )
        }
      />
      <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-600">
        Lịch sử đang lưu trên trình duyệt này. Backend chưa có{' '}
        <code className="font-mono">GET /query-history</code>; khi có sẽ đồng bộ theo tài khoản.
      </p>

      <Card
        title={`${entries.length} truy vấn`}
        subtitle="Sắp xếp theo thời gian mới nhất"
        bodyClassName="p-0"
      >
        {entries.length === 0 ? (
          <div className="pb-6">
            <EmptyState
              title="Chưa có truy vấn nào"
              description="Các câu hỏi bạn gửi ở trang Hỏi AI sẽ hiện ở đây."
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
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  {['Câu hỏi', 'Trạng thái', 'Số dòng', 'Thời gian chạy', 'Lúc', ''].map((head) => (
                    <th key={head} scope="col" className="px-3 py-2 font-medium">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <Fragment key={entry.id}>
                    <tr>
                      <td className="max-w-[360px] px-3 py-2.5 font-medium text-slate-900">
                        {entry.question}
                      </td>
                      <td className="px-3 py-2.5">
                        <Tag tone={statusTone(entry.status)}>{entry.status}</Tag>
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
                            <p className="text-xs text-rose-700">{entry.error}</p>
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
