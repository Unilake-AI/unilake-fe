'use client'

import { useRef, useState } from 'react'
import type { FormEvent } from 'react'

import Link from 'next/link'

import { useMutation } from '@tanstack/react-query'
import { Check, CircleAlert, Copy, LoaderCircle, SearchX, Send, Sparkles } from 'lucide-react'

import { API_AskNlq } from '@/api/api_data'
import { getApiErrorMessage } from '@/api/http'
import { Card, PageHeader, Tag } from '@/components/page/page-parts'
import { getDomain } from '@/config/domains'
import { useDomain } from '@/hooks/use-domain'
import { addQueryHistory } from '@/lib/query-history'
import type { NlqResponse } from '@/types/data'

const SUGGESTIONS = [
  'Tỷ lệ nhập học theo từng phương thức năm 2026?',
  'Khoa CNTT có bao nhiêu giảng viên?',
  'Điểm trung bình của sinh viên theo từng ngành?',
  'So sánh số nhập học theo ngành 2025 và 2026',
]

interface Turn {
  id: number
  question: string
  state: 'processing' | 'done' | 'error'
  result?: NlqResponse
  error?: string
  durationMs?: number
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

export function AskAiView({ historyHref }: { historyHref: string }) {
  const { domain } = useDomain()
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const nextId = useRef(1)

  const ask = useMutation({
    mutationFn: async ({ text }: { id: number; text: string }) => {
      const started = performance.now()
      const result = await API_AskNlq(text)
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
    },
    onError: (error, { id, text }) => {
      const message = getApiErrorMessage(error, 'Dịch vụ AI tạm thời không khả dụng.')
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
        title="Hỏi AI — Truy vấn bằng ngôn ngữ tự nhiên"
        description="Đặt câu hỏi bằng tiếng Việt, hệ thống sinh SQL, kiểm tra an toàn rồi truy vấn dữ liệu. Nguồn: POST /api/v1/nlq/ask."
        actions={
          <Link
            href={historyHref}
            className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Lịch sử truy vấn
          </Link>
        }
      />

      <Card title="Gợi ý câu hỏi thường gặp" subtitle="Nhấn để hỏi nhanh">
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              disabled={ask.isPending}
              onClick={() => send(item)}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
            >
              “{item}”
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-4" aria-live="polite">
        {turns.map((turn) => (
          <div key={turn.id} className="space-y-2">
            <div className="flex justify-end">
              <p className="max-w-[80%] rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">
                {turn.question}
              </p>
            </div>
            <Card
              title={
                <span className="flex items-center gap-2">
                  <Sparkles className="size-4 text-indigo-600" aria-hidden="true" />
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
                  <Tag tone="amber">PROCESSING</Tag>
                ) : turn.state === 'error' ? (
                  <Tag tone="rose">FAILED</Tag>
                ) : turn.result?.rows.length ? (
                  <Tag tone="emerald">COMPLETED</Tag>
                ) : (
                  <Tag tone="slate">NO_DATA</Tag>
                )
              }
              bodyClassName="space-y-3"
            >
              {turn.state === 'processing' && (
                <p className="flex items-center gap-2 text-sm text-slate-600" role="status">
                  <LoaderCircle
                    className="size-4 animate-spin text-indigo-600"
                    aria-hidden="true"
                  />
                  Đang phân tích câu hỏi… Đang xác định ý định, lấy schema và sinh SQL.
                </p>
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
                    className="text-xs font-semibold text-indigo-700 hover:underline disabled:opacity-60"
                  >
                    Thử lại
                  </button>
                </div>
              )}
              {turn.state === 'done' && turn.result && (
                <>
                  {turn.result.rows.length ? (
                    <>
                      <p className="text-sm text-slate-700">
                        Tìm thấy {turn.result.rows.length.toLocaleString('vi-VN')} dòng kết quả.
                      </p>
                      <ResultTable rows={turn.result.rows} />
                    </>
                  ) : (
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <SearchX className="size-4 text-slate-400" aria-hidden="true" />
                      Không tìm thấy dữ liệu phù hợp. Thử nới bộ lọc năm hoặc ngành.
                    </p>
                  )}
                  {turn.result.sql && <SqlBlock sql={turn.result.sql} />}
                </>
              )}
            </Card>
          </div>
        ))}
      </div>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-4 flex gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
      >
        <label htmlFor="ask-input" className="sr-only">
          Câu hỏi về dữ liệu
        </label>
        <input
          id="ask-input"
          className="h-9 min-w-0 flex-1 rounded-md px-2 text-sm focus-visible:outline-none"
          placeholder="Nhập câu hỏi về dữ liệu Tuyển sinh, Đào tạo hoặc Nhân sự…"
          value={question}
          maxLength={500}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button
          type="submit"
          disabled={ask.isPending || !question.trim()}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          <Send className="size-3.5" aria-hidden="true" />
          Gửi câu hỏi
        </button>
      </form>
    </div>
  )
}
