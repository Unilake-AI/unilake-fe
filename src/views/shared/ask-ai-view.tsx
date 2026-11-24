'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { useMutation } from '@tanstack/react-query'
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Copy,
  History,
  SearchX,
  Send,
  SquarePen,
} from 'lucide-react'

import { getApiErrorMessage } from '@/api/http'
import { API_AskNlq } from '@/api/shared/nlq'
import { LoadingState } from '@/components/page/page-parts'
import { useDomain } from '@/hooks/use-domain'
import { addQueryHistory, readQueryHistory } from '@/lib/query-history'
import type { DomainCode, DomainDefinition } from '@/types/domains'
import type { NlqConversationTurn, NlqResponse } from '@/types/nlq'
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
  hr: [
    'Thống kê tổng số nhân sự đang công tác hiện tại',
    'Số nhân sự theo từng phòng ban?',
    'Cơ cấu nhân sự theo trạng thái làm việc?',
  ],
  academic: [
    'Tổng số sinh viên theo từng bộ dữ liệu',
    'Số sinh viên theo chương trình đào tạo?',
    'Số sinh viên theo trạng thái học tập?',
  ],
  admissions: [
    'Tổng số hồ sơ tuyển sinh theo từng bộ dữ liệu',
    'Số hồ sơ theo phương thức xét tuyển?',
    'Số hồ sơ theo trạng thái tuyển sinh?',
  ],
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
    <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
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
  const [historyEntries, setHistoryEntries] = useState<QueryHistoryEntry[]>([])

  useEffect(() => {
    setHistoryEntries(readQueryHistory())
  }, [])

  return (
    <AskAiChat
      domain={domain}
      suggestions={suggestions}
      historyHref={historyHref}
      historyEntries={historyEntries}
      askQuestion={(text) => API_AskNlq(text, workspace)}
      onHistoryEntry={(entry) => {
        addQueryHistory(entry)
        setHistoryEntries(readQueryHistory())
      }}
    />
  )
}

export function AskAiChat({
  domain,
  suggestions,
  historyHref,
  historyEntries,
  historyStatus = 'Chưa có câu hỏi nào.',
  initialQuestion = '',
  askQuestion,
  onHistoryEntry,
}: {
  domain: DomainDefinition
  suggestions: string[]
  historyHref?: string
  historyEntries: Pick<QueryHistoryEntry, 'id' | 'question'>[]
  historyStatus?: string
  initialQuestion?: string
  askQuestion: (question: string) => Promise<NlqResponse>
  onHistoryEntry: (entry: QueryHistoryEntry) => void
}) {
  const [question, setQuestion] = useState(initialQuestion)
  const [turns, setTurns] = useState<NlqConversationTurn[]>([])
  const nextId = useRef(1)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const latestTurnRef = useRef<HTMLElement>(null)
  const latestTurnId = turns.at(-1)?.id

  useEffect(() => {
    if (latestTurnId !== undefined) {
      latestTurnRef.current?.scrollIntoView?.({ block: 'nearest' })
    }
  }, [latestTurnId])

  const ask = useMutation({
    meta: { readOnly: true },
    mutationFn: async ({ text }: { id: number; text: string }) => {
      const started = performance.now()
      const result = await askQuestion(text)
      return { result, durationMs: Math.round(performance.now() - started) }
    },
    onSuccess: ({ result, durationMs }, { id, text }) => {
      setTurns((prev) =>
        prev.map((t) => (t.id === id ? { ...t, state: 'done', result, durationMs } : t))
      )
      onHistoryEntry({
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
      const message = getApiErrorMessage(
        error,
        'Chưa thể trả lời câu hỏi lúc này. Vui lòng thử lại.'
      )
      setTurns((prev) =>
        prev.map((t) => (t.id === id ? { ...t, state: 'error', error: message } : t))
      )
      onHistoryEntry({
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
    composerRef.current?.focus({ preventScroll: true })
    ask.mutate({ id, text: trimmed })
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    send(question)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem] xl:grid-cols-[minmax(0,1fr)_17rem]">
      <section className="relative isolate flex min-h-[calc(100dvh-var(--workspace-header-height)-2.75rem)] min-w-0 flex-col rounded-2xl border bg-card">
        {turns.length === 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full rounded-[inherit] bg-[radial-gradient(ellipse_at_50%_35%,#fff2e5_0%,#fff6f7_30%,transparent_68%)]"
          />
        )}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3 sm:px-6">
          <div>
            <h1 className="font-semibold text-foreground">Hỏi UniLake AI</h1>
            <p className="text-xs text-muted-foreground">{domain.shortLabel}</p>
          </div>
        </header>

        {turns.length === 0 && (
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-end px-4 pb-5 pt-10 sm:px-8 sm:pb-7 sm:pt-14">
            <Image
              src={logo}
              alt=""
              width={104}
              height={104}
              className="size-20 object-contain sm:size-[104px]"
            />
            <h2 className="mt-3 text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {domain.code === 'all'
                ? 'Bạn muốn hỏi gì về dữ liệu?'
                : `Bạn muốn hỏi gì về ${domain.shortLabel}?`}
            </h2>
            <p className="mt-2 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
              Tra cứu số liệu Gold đã công bố trong phạm vi được cấp quyền.
            </p>
            {suggestions.length > 0 && (
              <ul aria-label="Câu hỏi gợi ý" className="mt-5 flex flex-wrap justify-center gap-2">
                {suggestions.map((item) => (
                  <li key={item} className="max-w-full">
                    <button
                      type="button"
                      onClick={() => send(item)}
                      className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-xl border border-rose-100 bg-white/90 px-3 py-2 text-left text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-rose-50"
                    >
                      <span>{item}</span>
                      <ArrowUpRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {turns.length > 0 && (
          <div
            role="log"
            aria-label="Cuộc hội thoại"
            className="mx-auto w-full max-w-4xl flex-1 space-y-7 px-4 py-6 sm:px-8"
          >
            {turns.map((turn) => (
              <article
                key={turn.id}
                ref={turn.id === latestTurnId ? latestTurnRef : null}
                className="scroll-mt-20 space-y-4"
              >
                <div className="flex justify-end">
                  <p className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-sidebar px-4 py-2.5 text-sm leading-relaxed text-white">
                    {turn.question}
                  </p>
                </div>

                <div className="flex items-start gap-2 sm:gap-3">
                  <Image
                    src={logo}
                    alt=""
                    width={32}
                    height={32}
                    className="mt-0.5 size-8 shrink-0 object-contain"
                  />
                  <div className="min-w-0 flex-1 space-y-3 rounded-2xl rounded-tl-sm border bg-card p-3 sm:p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h2 className="text-sm font-semibold text-foreground">UniLake AI</h2>
                      {turn.durationMs != null && (
                        <span className="text-xs text-muted-foreground">
                          Trả lời trong {turn.durationMs.toLocaleString('vi-VN')} ms
                        </span>
                      )}
                    </div>
                    {turn.state === 'processing' && (
                      <LoadingState label="Đang tìm dữ liệu để trả lời câu hỏi của bạn…" />
                    )}
                    {turn.state === 'error' && (
                      <div className="space-y-2">
                        <p className="flex items-start gap-2 text-sm font-medium text-rose-700">
                          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                          {turn.error}
                        </p>
                        <button
                          type="button"
                          onClick={() => send(turn.question)}
                          disabled={ask.isPending}
                          className="text-sm font-semibold text-primary hover:underline disabled:opacity-60"
                        >
                          Thử lại
                        </button>
                      </div>
                    )}
                    {turn.state === 'done' && turn.result && (
                      <>
                        {turn.result.answer && (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                            {turn.result.answer}
                          </p>
                        )}
                        {turn.result.rows.length ? (
                          <>
                            <p className="text-sm text-slate-700">
                              Tìm thấy {turn.result.rows.length.toLocaleString('vi-VN')} dòng kết
                              quả.
                            </p>
                            <ResultTable rows={turn.result.rows} />
                          </>
                        ) : (
                          !turn.result.answer && (
                            <p className="flex items-start gap-2 text-sm text-slate-600">
                              <SearchX
                                className="mt-0.5 size-4 shrink-0 text-slate-400"
                                aria-hidden="true"
                              />
                              Không tìm thấy dữ liệu phù hợp. Hãy thử đổi khoảng thời gian hoặc nhóm
                              dữ liệu.
                            </p>
                          )
                        )}
                        {turn.result.sql && (
                          <details>
                            <summary className="cursor-pointer text-sm text-muted-foreground">
                              Chi tiết truy vấn
                            </summary>
                            <SqlBlock sql={turn.result.sql} />
                          </details>
                        )}
                        {turn.result.truncated && (
                          <p role="status" className="text-xs text-amber-800">
                            Kết quả hiển thị tối đa 200 dòng. Hãy thu hẹp câu hỏi để xem đầy đủ.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div
          className={
            turns.length === 0
              ? 'mx-auto w-full max-w-3xl flex-1 px-4 pb-8 sm:px-8 sm:pb-12'
              : 'sticky bottom-0 z-10 rounded-b-2xl border-t bg-card px-4 py-3 sm:px-8'
          }
        >
          <form
            onSubmit={onSubmit}
            className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:border-primary/50"
          >
            <label htmlFor="ask-input" className="sr-only">
              Câu hỏi về dữ liệu
            </label>
            <textarea
              ref={composerRef}
              id="ask-input"
              rows={2}
              className="min-w-0 flex-1 resize-none rounded-lg bg-transparent p-2 text-sm leading-5 text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
              placeholder="Nhập câu hỏi về dữ liệu…"
              value={question}
              maxLength={500}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
            />
            <button
              type="submit"
              disabled={ask.isPending || !question.trim()}
              aria-busy={ask.isPending}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              aria-label="Gửi câu hỏi"
            >
              <Send className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Gửi</span>
            </button>
          </form>
        </div>
      </section>
      <aside
        aria-label="Điều khiển và lịch sử chat"
        className="flex max-h-80 min-w-0 flex-col rounded-2xl border bg-card p-3 lg:sticky lg:top-[calc(var(--workspace-header-height)+1.25rem)] lg:max-h-[calc(100dvh-var(--workspace-header-height)-2.75rem)] lg:self-start"
      >
        <button
          type="button"
          disabled={ask.isPending}
          onClick={() => {
            setTurns([])
            setQuestion('')
            composerRef.current?.focus()
          }}
          className="flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-primary/10 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
        >
          <SquarePen className="size-4" aria-hidden="true" />
          Chat mới
        </button>
        <h2 className="mb-1 mt-4 flex shrink-0 items-center gap-2 px-3 text-xs font-semibold text-muted-foreground">
          <History className="size-3.5" aria-hidden="true" />
          {historyHref ? (
            <Link href={historyHref} className="hover:text-primary hover:underline">
              Lịch sử
            </Link>
          ) : (
            'Lịch sử'
          )}
        </h2>
        {historyEntries.length === 0 ? (
          <p className="px-3 pb-2 pt-1 text-sm text-muted-foreground">{historyStatus}</p>
        ) : (
          <ul aria-label="Câu hỏi đã lưu" className="min-h-0 space-y-1 overflow-y-auto">
            {historyEntries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => {
                    setQuestion(entry.question)
                    composerRef.current?.focus()
                  }}
                  title={entry.question}
                  className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                >
                  {entry.question}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}
