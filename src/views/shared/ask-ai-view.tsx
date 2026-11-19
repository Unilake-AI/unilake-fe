'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { useMutation } from '@tanstack/react-query'
import { Check, CircleAlert, Copy, MessageSquare, SearchX, Send, Sparkles } from 'lucide-react'

import { getApiErrorMessage } from '@/api/http'
import { API_AskNlq } from '@/api/shared/nlq'
import { Card, EmptyState, LoadingState, PageHeader, Tag } from '@/components/page/page-parts'
import { getDomain } from '@/config/domains'
import { useDomain } from '@/hooks/use-domain'
import { addQueryHistory, readQueryHistory } from '@/lib/query-history'
import type { DomainCode } from '@/types/domains'
import type { NlqConversationTurn } from '@/types/nlq'
import type { QueryHistoryEntry } from '@/types/query-history'

import logo from '../../../public/logo.png'

const SUGGESTIONS: Record<DomainCode, string[]> = {
  all: [
    'Tỷ lệ nhập học theo từng phương thức năm 2026?',
    'Khoa CNTT có bao nhiêu giảng viên?',
    'Điểm trung bình của sinh viên theo từng ngành?',
    'So sánh số nhập học theo ngành 2025 và 2026',
  ],
  admissions: [
    'Tỷ lệ nhập học theo từng phương thức năm 2026?',
    'So sánh số nhập học theo ngành 2025 và 2026',
  ],
  academic: [
    'Điểm trung bình của sinh viên theo từng ngành?',
    'Số sinh viên đang học theo từng khoa?',
  ],
  hr: ['Khoa CNTT có bao nhiêu giảng viên?', 'Số giảng viên theo từng khoa?'],
}

const STAFF_SUGGESTIONS = {
  hr: ['Thống kê tổng số nhân sự đang công tác hiện tại'],
  academic: ['Tổng số sinh viên theo từng bộ dữ liệu'],
  admissions: ['Tổng số hồ sơ tuyển sinh theo từng bộ dữ liệu'],
}

function formatCell(value: unknown): string {
  if (value == null) {
    return '—'
  }
  if (typeof value === 'number') {
    return value.toLocaleString('vi-VN')
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'boolean' || typeof value === 'bigint') {
    return value.toString()
  }
  return JSON.stringify(value) ?? '—'
}

function ResultTable({ rows }: { rows: Record<string, unknown>[] }) {
  const columns = Object.keys(rows[0] ?? {})
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col" className="px-3 py-2 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.slice(0, 200).map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column} className="px-3 py-2 font-mono text-slate-700">
                  {formatCell(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SqlBlock({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(sql)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
          SQL được sinh (chỉ đọc)
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800"
        >
          {copied ? (
            <Check className="size-3" aria-hidden="true" />
          ) : (
            <Copy className="size-3" aria-hidden="true" />
          )}
          {copied ? 'Đã chép' : 'Sao chép'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-5 text-emerald-300">
        {sql}
      </pre>
    </div>
  )
}

export function AskAiView({
  historyHref,
  workspace,
}: { historyHref?: string; workspace?: 'STAFF' } = {}) {
  const { domain, availableDomains } = useDomain()
  const suggestions =
    workspace === 'STAFF'
      ? availableDomains.flatMap(({ code }) =>
          code !== 'all' && (domain.code === 'all' || code === domain.code)
            ? STAFF_SUGGESTIONS[code]
            : []
        )
      : SUGGESTIONS[domain.code]
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<NlqConversationTurn[]>([])
  const [historyEntries, setHistoryEntries] = useState<QueryHistoryEntry[]>([])
  const nextId = useRef(1)

  useEffect(() => {
    setHistoryEntries(readQueryHistory())
  }, [])

  const ask = useMutation({
    meta: { readOnly: true },
    mutationFn: async ({ text }: { id: number; text: string }) => {
      const started = performance.now()
      const result = await API_AskNlq(text, workspace)
      return { result, durationMs: Math.round(performance.now() - started) }
    },
    onSuccess: ({ result, durationMs }, { id, text }) => {
      setTurns((prev) =>
        prev.map((t) => (t.id === id ? { ...t, state: 'done', result, durationMs } : t))
      )
      addQueryHistory({
        id: `q_${Date.now()}`,
        question: text,
        status: result.rows.length ? 'COMPLETED' : 'NO_DATA',
        sql: result.sql,
        rowCount: result.rows.length,
        durationMs,
        askedAt: new Date().toISOString(),
      })
      setHistoryEntries(readQueryHistory())
    },
    onError: (error, { id, text }) => {
      const message = getApiErrorMessage(
        error,
        'Chưa thể trả lời câu hỏi lúc này. Vui lòng thử lại.'
      )
      setTurns((prev) =>
        prev.map((t) => (t.id === id ? { ...t, state: 'error', error: message } : t))
      )
      addQueryHistory({
        id: `q_${Date.now()}`,
        question: text,
        status: 'FAILED',
        sql: null,
        rowCount: 0,
        durationMs: 0,
        askedAt: new Date().toISOString(),
        error: message,
      })
      setHistoryEntries(readQueryHistory())
    },
  })

  function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || ask.isPending) {
      return
    }
    const id = nextId.current++
    setTurns((prev) => [...prev, { id, question: trimmed, state: 'processing' }])
    setQuestion('')
    ask.mutate({ id, text: trimmed })
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    send(question)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[getDomain(domain.code).shortLabel, 'Hỏi AI']}
        title="Hỏi UniLake AI"
        description={
          workspace === 'STAFF'
            ? 'Tra cứu số liệu Gold đã công bố của phòng ban. Chọn câu hỏi gợi ý để xem các thống kê đang hỗ trợ.'
            : 'Đặt câu hỏi bằng tiếng Việt trong phạm vi dữ liệu được cấp quyền.'
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-5">
          <Card
            title={
              <span className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                Gợi ý câu hỏi thường gặp
              </span>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={ask.isPending}
                  onClick={() => send(item)}
                  className="min-h-10 rounded-md border bg-card px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
                >
                  {item}
                </button>
              ))}
            </div>
          </Card>

          <form
            onSubmit={onSubmit}
            className="flex flex-wrap gap-2 rounded-lg border bg-card p-2 focus-within:border-ring"
          >
            <label htmlFor="ask-input" className="sr-only">
              Câu hỏi về dữ liệu
            </label>
            <Sparkles className="ml-2 mt-3 size-5 shrink-0 text-primary" />
            <input
              id="ask-input"
              className="h-10 min-w-0 flex-1 rounded-md px-2 text-sm focus-visible:outline-none"
              placeholder={`Nhập câu hỏi về dữ liệu ${domain.code === 'all' ? 'Tuyển sinh, Đào tạo hoặc Nhân sự' : domain.shortLabel}…`}
              value={question}
              maxLength={500}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button
              type="submit"
              disabled={ask.isPending || !question.trim()}
              aria-busy={ask.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Send className="size-4" aria-hidden="true" />
              Gửi câu hỏi
            </button>
          </form>

          {turns.length === 0 && (
            <EmptyState
              title="Hãy thử đặt câu hỏi đầu tiên"
              description={`Bạn có thể hỏi về số liệu, thống kê hoặc so sánh trong phân hệ ${domain.shortLabel}.`}
            />
          )}

          <div className="space-y-4" aria-live="polite">
            {turns.map((turn) => (
              <div key={turn.id} className="space-y-2">
                <div className="flex justify-end">
                  <p className="max-w-[80%] rounded-lg bg-sidebar px-3 py-2 text-sm text-white">
                    {turn.question}
                  </p>
                </div>
                <Card
                  title={
                    <span className="flex items-center gap-2">
                      <Image src={logo} alt="" width={24} height={24} />
                      UniLake AI
                    </span>
                  }
                  subtitle={
                    turn.durationMs != null
                      ? `Trả lời trong ${turn.durationMs.toLocaleString('vi-VN')} ms`
                      : undefined
                  }
                  right={
                    turn.state === 'processing' ? (
                      <Tag tone="amber">Đang tìm câu trả lời</Tag>
                    ) : turn.state === 'error' ? (
                      <Tag tone="rose">Chưa trả lời được</Tag>
                    ) : turn.result?.rows.length ? (
                      <Tag tone="emerald">Đã có kết quả</Tag>
                    ) : (
                      <Tag tone="slate">Không có kết quả</Tag>
                    )
                  }
                  bodyClassName="space-y-3"
                >
                  {turn.state === 'processing' && (
                    <LoadingState label="Đang tìm dữ liệu để trả lời câu hỏi của bạn…" />
                  )}
                  {turn.state === 'error' && (
                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-sm font-medium text-rose-700">
                        <CircleAlert className="size-4" aria-hidden="true" />
                        {turn.error}
                      </p>
                      <button
                        type="button"
                        onClick={() => send(turn.question)}
                        disabled={ask.isPending}
                        className="text-xs font-semibold text-primary hover:underline disabled:opacity-60"
                      >
                        Thử lại
                      </button>
                    </div>
                  )}
                  {turn.state === 'done' && turn.result && (
                    <>
                      {turn.result.answer && (
                        <p className="text-sm text-slate-700">{turn.result.answer}</p>
                      )}
                      {turn.result.rows.length ? (
                        <>
                          <p className="text-sm text-slate-700">
                            Tìm thấy {turn.result.rows.length.toLocaleString('vi-VN')} dòng kết quả.
                          </p>
                          <ResultTable rows={turn.result.rows} />
                        </>
                      ) : !turn.result.answer ? (
                        <p className="flex items-center gap-2 text-sm text-slate-600">
                          <SearchX className="size-4 text-slate-400" aria-hidden="true" />
                          Không tìm thấy dữ liệu phù hợp. Hãy thử hỏi về một khoảng thời gian hoặc
                          nhóm ngành rộng hơn.
                        </p>
                      ) : null}
                      {turn.result.sql && (
                        <details>
                          <summary className="cursor-pointer text-xs text-slate-500">
                            Chi tiết truy vấn
                          </summary>
                          <SqlBlock sql={turn.result.sql} />
                        </details>
                      )}
                    </>
                  )}
                </Card>
              </div>
            ))}
          </div>
        </div>
        <Card
          title={
            <span className="flex items-center gap-2">
              <MessageSquare className="size-5 text-[#5146e7]" />
              Lịch sử truy vấn gần đây
            </span>
          }
          right={
            historyHref ? (
              <Link href={historyHref} className="text-xs font-semibold text-indigo-700">
                Xem tất cả
              </Link>
            ) : undefined
          }
        >
          {historyEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#65718d]">
              Chưa có câu hỏi nào được lưu trên trình duyệt này.
            </p>
          ) : (
            <ul className="divide-y divide-[#e5e9f3]">
              {historyEntries.slice(0, 5).map((entry) => (
                <li key={entry.id} className="py-3">
                  <p className="line-clamp-2 text-sm font-medium text-[#17233d]">
                    {entry.question}
                  </p>
                  <time className="mt-1 block text-xs text-[#65718d]">
                    {new Date(entry.askedAt).toLocaleString('vi-VN')}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
