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

interface DomainAiPreset {
  domainTitle: string
  scopeText: string
  defaultQuestion: string
  summaryText: string
  chartTitle: string
  metricLabel: string
  maxDomain: number
  ticks: number[]
  chartData: { name: string; rate: number }[]
  tableData: { label: string; rate: string }[]
  sourceTag: string
  colLabel: string
  itemCountLabel: string
}

const DOMAIN_PRESETS: Record<string, DomainAiPreset> = {
  hr: {
    domainTitle: 'Trợ lý phân tích dữ liệu Nhân sự',
    scopeText: 'Dữ liệu trong phạm vi Nhân sự',
    defaultQuestion: 'Cơ cấu nhân sự theo trạng thái làm việc hiện tại?',
    summaryText: 'Trong dữ liệu minh họa, tỷ lệ nhân viên chính thức chiếm đa số, khoảng 64,5%.',
    chartTitle: 'Tỷ lệ theo trạng thái nhân sự',
    metricLabel: 'Tỷ lệ nhân sự',
    maxDomain: 80,
    ticks: [0, 20, 40, 60, 80],
    chartData: [
      { name: 'Chính thức', rate: 64.5 },
      { name: 'Hợp đồng', rate: 22.0 },
      { name: 'Thử việc', rate: 8.5 },
      { name: 'Tập sự', rate: 5.0 },
    ],
    tableData: [
      { label: 'Chính thức', rate: '64,5%' },
      { label: 'Hợp đồng dài hạn', rate: '22,0%' },
      { label: 'Thử việc', rate: '8,5%' },
      { label: 'Tập sự / Thực tập', rate: '5,0%' },
    ],
    sourceTag: 'Nguồn: HR · Nhân sự',
    colLabel: 'Trạng thái nhân sự',
    itemCountLabel: '4 nhóm trạng thái',
  },
  admissions: {
    domainTitle: 'Trợ lý phân tích dữ liệu Tuyển sinh',
    scopeText: 'Dữ liệu trong phạm vi Tuyển sinh',
    defaultQuestion: 'Tỷ lệ hồ sơ nhập học theo từng phương thức xét tuyển?',
    summaryText: 'Trong dữ liệu minh họa, phương thức xét tuyển điểm thi THPT chiếm tỷ trọng cao nhất, khoảng 45%.',
    chartTitle: 'Tỷ lệ theo phương thức tuyển sinh',
    metricLabel: 'Tỷ lệ hồ sơ',
    maxDomain: 60,
    ticks: [0, 15, 30, 45, 60],
    chartData: [
      { name: 'Điểm THPT', rate: 45.0 },
      { name: 'ĐGNL', rate: 30.5 },
      { name: 'Học bạ', rate: 18.0 },
      { name: 'Tuyển thẳng', rate: 6.5 },
    ],
    tableData: [
      { label: 'Điểm thi THPT', rate: '45,0%' },
      { label: 'Đánh giá năng lực (ĐGNL)', rate: '30,5%' },
      { label: 'Xét tuyển học bạ', rate: '18,0%' },
      { label: 'Tuyển thẳng & Ưu tiên', rate: '6,5%' },
    ],
    sourceTag: 'Nguồn: Admissions · Tuyển sinh',
    colLabel: 'Phương thức',
    itemCountLabel: '4 phương thức',
  },
  academic: {
    domainTitle: 'Trợ lý phân tích dữ liệu Đào tạo',
    scopeText: 'Dữ liệu trong phạm vi Đào tạo',
    defaultQuestion: 'Môn nào có tỷ lệ trượt cao nhất học kỳ này?',
    summaryText: 'Trong dữ liệu minh họa, môn Cấu trúc dữ liệu có tỷ lệ trượt cao nhất, khoảng 28,5%.',
    chartTitle: 'Tỷ lệ trượt theo môn học',
    metricLabel: 'Tỷ lệ trượt',
    maxDomain: 32,
    ticks: [0, 8, 16, 24, 32],
    chartData: [
      { name: 'Cấu trúc DL', rate: 28.5 },
      { name: 'Cơ sở dữ liệu', rate: 19.2 },
      { name: 'Lập trình Web', rate: 14.8 },
      { name: 'Kiểm thử PM', rate: 9.6 },
    ],
    tableData: [
      { label: 'Cấu trúc dữ liệu', rate: '28,5%' },
      { label: 'Cơ sở dữ liệu', rate: '19,2%' },
      { label: 'Lập trình Web', rate: '14,8%' },
      { label: 'Kiểm thử phần mềm', rate: '9,6%' },
    ],
    sourceTag: 'Nguồn: Academic · Đào tạo',
    colLabel: 'Môn học',
    itemCountLabel: '4 môn học',
  },
}

export function ManagerAiView() {
  const params = useSearchParams()
  const tab = params.get('tab') === 'history' ? 'history' : 'ask'

  return (
    <ManagerGate>
      {(context) => {
        const domain = (context.domains[0]?.domain as 'hr' | 'academic' | 'admissions') ?? 'hr'
        const preset: DomainAiPreset = DOMAIN_PRESETS[domain] ?? (DOMAIN_PRESETS.hr as DomainAiPreset)
        const initialQ = params.get('q') ?? preset.defaultQuestion

        return (
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
              <ManagerAiContent domain={domain} initialQuestion={initialQ} preset={preset} />
            )}
          </div>
        )
      }}
    </ManagerGate>
  )
}

function ManagerAiContent({
  domain,
  initialQuestion,
  preset,
}: {
  domain: string
  initialQuestion: string
  preset: DomainAiPreset
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
    if (trimmed !== preset.defaultQuestion) {
      askMutation.mutate(trimmed)
    } else {
      setCustomResult(null)
      setCustomError(null)
    }
  }

  const isDefault = activeQuestion === preset.defaultQuestion

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="shadow-xs grid size-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Bot className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Hỏi UniLake AI</h1>
            <p className="text-xs text-slate-500">{preset.domainTitle}</p>
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

      {/* User Question Block */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Câu hỏi của bạn
        </p>
        <p className="mt-1 text-base font-semibold text-slate-900">{activeQuestion}</p>
      </div>

      {/* AI Analysis Result Card */}
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
              {preset.summaryText}
            </p>

            {/* Bar Chart Section */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {preset.chartTitle}
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={preset.chartData}
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
                      domain={[0, preset.maxDomain]}
                      ticks={preset.ticks}
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
                      formatter={(val) => [`${String(val ?? 0)}%`, preset.metricLabel]}
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
                  {preset.itemCountLabel}
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3.5 py-2.5 font-medium">{preset.colLabel}</th>
                      <th className="px-3.5 py-2.5 text-right font-medium">{preset.metricLabel}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {preset.tableData.map((row) => (
                      <tr key={row.label} className="hover:bg-slate-50/50">
                        <td className="px-3.5 py-2.5">{row.label}</td>
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
                  {preset.sourceTag}
                </span>
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                  Dữ liệu minh họa
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Query Form at Bottom */}
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
            placeholder={`Nhập câu hỏi phân tích dữ liệu ${domain.toUpperCase()}...`}
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
            <span>{preset.scopeText}</span>
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
