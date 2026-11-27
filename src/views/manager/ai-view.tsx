'use client'

import { useState } from 'react'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, History } from 'lucide-react'

import { getApiErrorMessage } from '@/api/http'
import { API_ManagerHistory, API_ManagerHistoryDetail } from '@/api/manager/history'
import { API_AskNlq } from '@/api/shared/nlq'
import { DetailDrawer } from '@/components/page/detail-drawer'
import {
  PageHeader,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Tag,
  formatDateTime,
} from '@/components/page/page-parts'
import { getDomain, isDomainCode } from '@/config/domains'
import type { BusinessDomain } from '@/types/domains'
import { AskAiChat } from '@/views/shared/ask-ai-view'

import { ManagerGate, Paging, label, number } from './report-parts'

function formatCell(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return JSON.stringify(value) ?? '—'
}

const MANAGER_SUGGESTIONS: Record<BusinessDomain, string[]> = {
  hr: [
    'Cơ cấu nhân sự theo trạng thái làm việc hiện tại?',
    'Đơn vị nào có nhiều giảng viên nhất?',
    'Cơ cấu học vị của giảng viên theo khoa?',
  ],
  academic: [
    'Tỷ lệ đạt theo từng học kỳ?',
    'Ngành nào có điểm trung bình cao nhất?',
    'So sánh số sinh viên đang học theo từng khoa',
  ],
  admissions: [
    'Tỷ lệ nhập học theo từng phương thức xét tuyển?',
    'Ngành nào có nhiều hồ sơ nhất trong năm tuyển sinh gần đây?',
    'So sánh số nhập học theo ngành giữa hai năm gần nhất',
  ],
}

const HISTORY_PAGE_SIZE = 20

function useManagerHistory(userId: number, domain: string, page = 0) {
  return useQuery({
    queryKey: ['manager', 'history', userId, domain, page],
    queryFn: () =>
      API_ManagerHistory({
        domain,
        limit: HISTORY_PAGE_SIZE,
        offset: page * HISTORY_PAGE_SIZE,
      }),
    retry: false,
  })
}

export function ManagerAiView() {
  const params = useSearchParams()
  const initialQuestion = params.get('q') ?? ''

  return (
    <ManagerGate>
      {(context) => {
        const domain = context.default_domain ?? context.domains[0]?.domain ?? 'hr'
        const key = `${context.user_id}:${domain}`

        return params.get('tab') === 'history' ? (
          <ManagerHistoryTab key={key} domain={domain} userId={context.user_id} />
        ) : (
          <ManagerChat
            key={`${key}:${initialQuestion}`}
            userId={context.user_id}
            domain={domain}
            initialQuestion={initialQuestion}
          />
        )
      }}
    </ManagerGate>
  )
}

function ManagerChat({
  domain,
  userId,
  initialQuestion,
}: {
  domain: string
  userId: number
  initialQuestion: string
}) {
  const domainInfo = getDomain(isDomainCode(domain) ? domain : 'all')
  const history = useManagerHistory(userId, domain)
  const queryClient = useQueryClient()

  return (
    <AskAiChat
      domain={domainInfo}
      suggestions={domainInfo.code === 'all' ? [] : MANAGER_SUGGESTIONS[domainInfo.code]}
      initialQuestion={initialQuestion}
      historyEntries={history.data?.items ?? []}
      historyStatus={
        history.isPending
          ? 'Đang tải lịch sử…'
          : history.isError
            ? 'Không thể tải lịch sử.'
            : undefined
      }
      askQuestion={(text) => API_AskNlq(text, { domain })}
      onHistoryEntry={() => {
        void queryClient.invalidateQueries({ queryKey: ['manager', 'history', userId, domain] })
      }}
    />
  )
}

function ManagerHistoryTab({ domain, userId }: { domain: string; userId: number }) {
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const historyQuery = useManagerHistory(userId, domain, page)

  const detailQuery = useQuery({
    queryKey: ['manager', 'history', 'detail', userId, selectedId],
    queryFn: () => (selectedId ? API_ManagerHistoryDetail(selectedId) : null),
    enabled: Boolean(selectedId),
    retry: false,
  })

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<History />}
        title="Lịch sử truy vấn"
        description={`Các câu hỏi và kết quả phân tích UniLake AI gần đây trong phạm vi ${label(domain)}`}
        actions={
          <Link
            href="/manager/ai"
            className="shadow-xs rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Quay lại Hỏi AI
          </Link>
        }
      />

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
              size={HISTORY_PAGE_SIZE}
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
