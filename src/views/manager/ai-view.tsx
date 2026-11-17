'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { useMutation } from '@tanstack/react-query'
import { Bot, Clock, History, Send, Sparkles } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { getApiErrorMessage } from '@/api/http'
import { API_AskNlq } from '@/api/shared/nlq'
import { addQueryHistory } from '@/lib/query-history'
import type { NlqResponse } from '@/types/nlq'
import { QueryHistoryView } from '@/views/shared/query-history-view'

import { ManagerGate } from './report-parts'

function formatCell(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return JSON.stringify(value) ?? '—'
}

const DEFAULT_QUESTION = 'Môn nào có tỷ lệ trượt cao nhất học kỳ này?'

const DEFAULT_CHART_DATA = [
  { name: 'Cấu trúc DL', rate: 28.5 },
  { name: 'Cơ sở dữ liệu', rate: 19.2 },
  { name: 'Lập trình Web', rate: 14.8 },
  { name: 'Kiểm thử PM', rate: 9.6 },
]

const DEFAULT_TABLE_DATA = [
  { subject: 'Cấu trúc dữ liệu', rate: '28,5%' },
  { subject: 'Cơ sở dữ liệu', rate: '19,2%' },
  { subject: 'Lập trình Web', rate: '14,8%' },
  { subject: 'Kiểm thử phần mềm', rate: '9,6%' },
]

export function ManagerAiView() {
  const params = useSearchParams()
  const tab = params.get('tab') === 'history' ? 'history' : 'ask'
  const initialQ = params.get('q') ?? DEFAULT_QUESTION

  return (
    <ManagerGate>
      {(context) => (
        <div className="space-y-6" key={context.user_id}>
          {tab === 'history' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="shadow-xs grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-primary">
                    <History className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">
                      Lịch sử truy vấn
                    </h1>
                    <p className="text-xs text-slate-500">
                      Các câu hỏi và phân tích đã thực hiện gần đây
                    </p>
                  </div>
                </div>

                <Link
                  href="/manager/ask"
                  className="shadow-xs rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Quay lại Hỏi AI
                </Link>
              </div>

              <div className="shadow-xs rounded-xl border border-slate-200/90 bg-white p-5">
                <QueryHistoryView askHref="/manager/ask" />
              </div>
            </div>
          ) : (
            <ManagerAiContent domain="academic" initialQuestion={initialQ} />
          )}
        </div>
      )}
    </ManagerGate>
  )
}

function ManagerAiContent({
  domain: _domain,
  initialQuestion,
}: {
  domain: string
  initialQuestion: string
}) {
  const [activeQuestion, setActiveQuestion] = useState(initialQuestion)
  const [inputQuestion, setInputQuestion] = useState(initialQuestion)
  const [customResult, setCustomResult] = useState<NlqResponse | null>(null)
  const [customError, setCustomError] = useState<string | null>(null)

  const askMutation = useMutation({
    meta: { readOnly: true },
    mutationFn: async (text: string) => {
      const started = performance.now()
      const result = await API_AskNlq(text)
      return { result, durationMs: Math.round(performance.now() - started) }
    },
    onSuccess: ({ result, durationMs }, text) => {
      setCustomResult(result)
      setCustomError(null)
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
    onError: (error, text) => {
      const message = getApiErrorMessage(
        error,
        'Chưa thể trả lời câu hỏi lúc này. Vui lòng thử lại.'
      )
      setCustomError(message)
      setCustomResult(null)
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

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = inputQuestion.trim()
    if (!trimmed || askMutation.isPending) return

    setActiveQuestion(trimmed)
    if (trimmed !== DEFAULT_QUESTION) {
      askMutation.mutate(trimmed)
    } else {
      setCustomResult(null)
      setCustomError(null)
    }
  }

  const isDefault = activeQuestion === DEFAULT_QUESTION

  return (
    <div className="space-y-6">
      {/* Top Header (Image 3 in Light Theme) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="shadow-xs grid size-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Bot className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Hỏi UniLake AI</h1>
            <p className="text-xs text-slate-500">Trợ lý phân tích dữ liệu Đào tạo</p>
          </div>
        </div>

        <Link
          href="/manager/ask?tab=history"
          className="shadow-xs grid size-9 place-items-center rounded-lg border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          title="Lịch sử truy vấn"
          aria-label="Lịch sử truy vấn"
        >
          <Clock className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {/* User Question Block (Image 3) */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Câu hỏi của bạn
        </p>
        <p className="mt-1 text-base font-semibold text-slate-900">{activeQuestion}</p>
      </div>

      {/* AI Analysis Result Card (Image 3 in Light Theme) */}
      <div className="shadow-xs space-y-6 rounded-xl border border-slate-200/90 bg-white p-6">
        <div className="flex items-center gap-2 text-emerald-600">
          <Sparkles className="size-4" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Kết quả phân tích</h2>
        </div>

        {customError ? (
          <p className="text-xs text-rose-600">{customError}</p>
        ) : customResult && !isDefault ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-800">
              {customResult.rows.length
                ? `Tìm thấy ${customResult.rows.length} kết quả phù hợp từ cơ sở dữ liệu.`
                : 'Không có bản ghi nào phù hợp với câu hỏi.'}
            </p>
            {customResult.rows.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <tr>
                      {Object.keys(customResult.rows[0] ?? {}).map((col) => (
                        <th key={col} className="px-3.5 py-2.5 font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {customResult.rows
                      .slice(0, 10)
                      .map((row: Record<string, unknown>, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          {Object.keys(row).map((col) => (
                            <td key={col} className="px-3.5 py-2.5">
                              {formatCell(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-slate-800">
              Trong dữ liệu minh họa, môn Cấu trúc dữ liệu có tỷ lệ trượt cao nhất, khoảng 28,5%.
            </p>

            {/* Bar Chart Section */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tỷ lệ trượt theo môn học
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={DEFAULT_CHART_DATA}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#cbd5e1"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis
                      stroke="#cbd5e1"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      domain={[0, 32]}
                      ticks={[0, 8, 16, 24, 32]}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        color: '#0f172a',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      formatter={(val) => [`${String(val ?? 0)}%`, 'Tỷ lệ trượt']}
                    />
                    <Bar dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={70} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-400">Số liệu minh họa UI, không lấy từ UniLake</p>
            </div>

            {/* Table Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Bảng kết quả</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  4 môn học
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3.5 py-2.5 font-medium">Môn học</th>
                      <th className="px-3.5 py-2.5 text-right font-medium">Tỷ lệ trượt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {DEFAULT_TABLE_DATA.map((row) => (
                      <tr key={row.subject} className="hover:bg-slate-50/50">
                        <td className="px-3.5 py-2.5">{row.subject}</td>
                        <td className="px-3.5 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                          {row.rate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                  Nguồn: Academic
                </span>
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                  Dữ liệu minh họa
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Query Form at Bottom (Image 3 in Light Theme) */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <label
          htmlFor="manager-question-input"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          Đặt câu hỏi mới
        </label>
        <div className="shadow-xs relative rounded-xl border border-slate-300 bg-white p-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <input
            id="manager-question-input"
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder="Nhập câu hỏi phân tích dữ liệu..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
            <span>Dữ liệu trong phạm vi Đào tạo</span>
            <button
              type="submit"
              disabled={askMutation.isPending || !inputQuestion.trim()}
              className="shadow-xs flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="size-3.5" aria-hidden="true" />
              <span>{askMutation.isPending ? 'Đang phân tích…' : 'Gửi câu hỏi'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
