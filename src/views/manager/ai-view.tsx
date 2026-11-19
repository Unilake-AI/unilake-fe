'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { useMutation, useQuery } from '@tanstack/react-query'
import { Bot, Clock, Eye, History, RefreshCw, Send, Sparkles } from 'lucide-react'

import { getApiErrorMessage } from '@/api/http'
import { API_ManagerHistory, API_ManagerHistoryDetail } from '@/api/manager/history'
import { API_AskNlq } from '@/api/shared/nlq'
import { DetailDrawer } from '@/components/page/detail-drawer'
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Tag,
  formatDateTime,
} from '@/components/page/page-parts'
import type { NlqResponse } from '@/types/nlq'

import { ManagerGate, Paging, label, number } from './report-parts'

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
}

const DOMAIN_PRESETS: Record<string, DomainAiPreset> = {
  hr: {
    domainTitle: 'Trợ lý phân tích dữ liệu Nhân sự',
    scopeText: 'Dữ liệu Gold của phòng Nhân sự',
    defaultQuestion: 'Cơ cấu nhân sự theo trạng thái làm việc hiện tại?',
  },
  academic: {
    domainTitle: 'Trợ lý phân tích dữ liệu Đào tạo',
    scopeText: 'Dữ liệu Gold của phòng Đào tạo',
    defaultQuestion: 'Số bản ghi sinh viên theo từng chương trình đào tạo?',
  },
  admissions: {
    domainTitle: 'Trợ lý phân tích dữ liệu Tuyển sinh',
    scopeText: 'Dữ liệu Gold của phòng Tuyển sinh',
    defaultQuestion: 'Số hồ sơ theo trạng thái tuyển sinh?',
  },
}

export function ManagerAiView() {
  const params = useSearchParams()
  const tab = params.get('tab') === 'history' ? 'history' : 'ask'

  return (
    <ManagerGate>
      {(context) => {
        const domain = (context.default_domain ?? context.domains[0]?.domain ?? 'hr') as
          'hr' | 'academic' | 'admissions'
        const preset: DomainAiPreset =
          DOMAIN_PRESETS[domain] ?? (DOMAIN_PRESETS.hr as DomainAiPreset)
        const initialQ = params.get('q') ?? preset.defaultQuestion

        return (
          <div className="space-y-6" key={context.user_id}>
            {tab === 'history' ? (
              <ManagerHistoryTab domain={domain} userId={context.user_id} />
            ) : (
              <ManagerAiContent domain={domain} initialQuestion={initialQ} preset={preset} />
            )}
          </div>
        )
      }}
    </ManagerGate>
  )
}

function ManagerHistoryTab({ domain, userId }: { domain: string; userId: number }) {
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pageSize = 20

  const historyQuery = useQuery({
    queryKey: ['manager', 'history', userId, domain, page],
    queryFn: () => API_ManagerHistory({ domain, limit: pageSize, offset: page * pageSize }),
    retry: false,
  })

  const detailQuery = useQuery({
    queryKey: ['manager', 'history', 'detail', userId, selectedId],
    queryFn: () => (selectedId ? API_ManagerHistoryDetail(selectedId) : null),
    enabled: Boolean(selectedId),
    retry: false,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="shadow-xs grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-primary">
            <History className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Lịch sử truy vấn</h1>
            <p className="text-xs text-slate-500">
              Các câu hỏi và kết quả phân tích UniLake AI gần đây trong phạm vi {label(domain)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <>
            <Button
              variant="outline"
              onClick={() => void historyQuery.refetch()}
              disabled={historyQuery.isFetching}
              icon={
                <RefreshCw
                  className={`size-3.5 ${historyQuery.isFetching ? 'animate-spin' : ''}`}
                />
              }
            >
              Làm mới
            </Button>
          </>
          <Link
            href="/manager/ai"
            className="shadow-xs rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Quay lại Hỏi AI
          </Link>
        </div>
      </div>

      <div className="shadow-xs rounded-xl border border-slate-200/90 bg-white p-5">
        {historyQuery.isPending ? (
          <LoadingState label="Đang tải lịch sử truy vấn…" />
        ) : historyQuery.isError ? (
          <ErrorState
            message={getApiErrorMessage(historyQuery.error, 'Không thể tải lịch sử truy vấn.')}
            onRetry={() => void historyQuery.refetch()}
          />
        ) : !historyQuery.data.items.length ? (
          <EmptyState
            title="Chưa có lịch sử truy vấn"
            description="Đặt câu hỏi tại Hỏi UniLake AI để lưu lại kết quả phân tích."
          />
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {historyQuery.data.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5 hover:bg-slate-50/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{item.question}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(item.created_at)}
                      {item.duration_ms != null ? ` · ${number(item.duration_ms)} ms` : ''}
                      {item.row_count != null ? ` · ${number(item.row_count)} dòng` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Tag
                      tone={
                        item.status === 'COMPLETED'
                          ? 'emerald'
                          : item.status === 'FAILED'
                            ? 'rose'
                            : 'slate'
                      }
                    >
                      {label(item.status)}
                    </Tag>
                    <Button
                      variant="outline"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => setSelectedId(item.id)}
                      icon={<Eye className="size-3.5" />}
                    >
                      Xem kết quả
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Paging
              page={page}
              setPage={setPage}
              total={historyQuery.data.total}
              count={historyQuery.data.items.length}
              size={pageSize}
            />
          </>
        )}
      </div>

      <DetailDrawer
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title="Chi tiết kết quả truy vấn"
      >
        {detailQuery.isPending ? (
          <LoadingState label="Đang tải kết quả truy vấn cũ…" />
        ) : detailQuery.isError ? (
          <ErrorState
            message={getApiErrorMessage(detailQuery.error, 'Không thể tải chi tiết truy vấn.')}
            onRetry={() => void detailQuery.refetch()}
          />
        ) : detailQuery.data ? (
          <div className="space-y-4 text-xs">
            <div>
              <p className="font-semibold uppercase tracking-wider text-slate-500">Câu hỏi</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {detailQuery.data.question}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div>
                <span className="block text-slate-500">Trạng thái</span>
                <span className="font-semibold text-slate-900">
                  {label(detailQuery.data.status)}
                </span>
              </div>
              <div>
                <span className="block text-slate-500">Thời gian thực thi</span>
                <span className="font-semibold text-slate-900">
                  {detailQuery.data.duration_ms != null
                    ? `${number(detailQuery.data.duration_ms)} ms`
                    : '—'}
                </span>
              </div>
              <div>
                <span className="block text-slate-500">Số dòng kết quả</span>
                <span className="font-semibold text-slate-900">
                  {detailQuery.data.row_count != null ? number(detailQuery.data.row_count) : '—'}
                </span>
              </div>
              <div>
                <span className="block text-slate-500">Thời điểm hỏi</span>
                <span className="font-semibold text-slate-900">
                  {formatDateTime(detailQuery.data.created_at)}
                </span>
              </div>
            </div>
            {detailQuery.data.answer && (
              <div className="whitespace-pre-wrap rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 leading-relaxed text-slate-800">
                {detailQuery.data.answer}
              </div>
            )}
            {detailQuery.data.sql && (
              <div>
                <p className="mb-1 font-semibold text-slate-700">Câu lệnh SQL phát sinh</p>
                <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-900 p-3 font-mono text-[11px] text-slate-100">
                  {detailQuery.data.sql}
                </pre>
              </div>
            )}
            {detailQuery.data.rows && detailQuery.data.rows.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <tr>
                      {Object.keys(detailQuery.data.rows[0] ?? {}).map((col) => (
                        <th key={col} className="px-3 py-2 font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {detailQuery.data.rows.slice(0, 200).map((row, idx) => (
                      <tr key={idx}>
                        {Object.keys(row).map((col) => (
                          <td key={col} className="px-3 py-2">
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
        ) : null}
      </DetailDrawer>
    </div>
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
      const result = await API_AskNlq(text, { domain })
      return { result }
    },
    onSuccess: ({ result }) => {
      setCustomResult(result)
      setCustomError(null)
    },
    onError: (error) => {
      const message = getApiErrorMessage(
        error,
        'Chưa thể trả lời câu hỏi lúc này. Vui lòng thử lại.'
      )
      setCustomError(message)
      setCustomResult(null)
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = inputQuestion.trim()
    if (!trimmed || askMutation.isPending) return

    setActiveQuestion(trimmed)
    setCustomResult(null)
    setCustomError(null)
    askMutation.mutate(trimmed)
  }

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
          href="/manager/ai?tab=history"
          className="shadow-xs inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          title="Lịch sử truy vấn"
          aria-label="Lịch sử truy vấn"
        >
          <Clock className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Lịch sử truy vấn</span>
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
          <p role="alert" className="text-xs text-rose-600">
            {customError}
          </p>
        ) : customResult ? (
          <div className="space-y-4">
            {customResult.answer ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                {customResult.answer}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-slate-800">
                {customResult.rows.length
                  ? `Tìm thấy ${customResult.rows.length} kết quả phù hợp từ cơ sở dữ liệu.`
                  : 'Không có bản ghi nào phù hợp với câu hỏi.'}
              </p>
            )}
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
                      .slice(0, 200)
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
            {customResult.truncated && (
              <p role="status" className="text-xs text-amber-800">
                Kết quả hiển thị 200 dòng đầu. Hãy thu hẹp câu hỏi để xem đầy đủ.
              </p>
            )}
            {customResult.sql && (
              <details className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
                <summary className="cursor-pointer font-medium text-slate-600">
                  Xem câu lệnh SQL phát sinh
                </summary>
                <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-2.5 font-mono text-[11px] text-slate-100">
                  {customResult.sql}
                </pre>
              </details>
            )}
          </div>
        ) : (
          <p role="status" className="text-sm text-slate-600">
            {askMutation.isPending
              ? 'Đang phân tích câu hỏi…'
              : 'Gửi câu hỏi để xem câu trả lời và bảng số liệu Gold của phòng ban.'}
          </p>
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
