'use client'

import { useState } from 'react'

import Link from 'next/link'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { toast } from 'sonner'

import { getApiErrorMessage } from '@/api/http'
import {
  API_Notifications,
  API_ReadNotifications,
  issueNotificationHref,
} from '@/api/shared/notifications'
import type { NotificationWorkspace } from '@/api/shared/notifications'
import { Button, ErrorState, LoadingState, formatDateTime } from '@/components/page/page-parts'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'

const eventNames: Record<string, string> = {
  ASSIGNED: 'Yêu cầu xử lý mới',
  ASSIGNEE_CHANGED: 'Đã đổi người phụ trách',
  RETURN_APPROVED: 'Dữ liệu lỗi được gửi trả',
  RESOLUTION_SUBMITTED: 'Đã nộp bản sửa',
  VERIFIED: 'Đã xác minh bản sửa',
  VERIFICATION_REJECTED: 'Cần sửa lại dữ liệu',
}

export function NotificationsMenu({ workspace }: { workspace: NotificationWorkspace }) {
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ['notifications', user?.id, workspace, unreadOnly, page],
    queryFn: () =>
      API_Notifications({ workspace, unread_only: unreadOnly, limit: 10, offset: page * 10 }),
    enabled: Boolean(user?.id),
    refetchInterval: 15_000,
  })
  const mark = useMutation({
    mutationFn: API_ReadNotifications,
    onSuccess: () => client.invalidateQueries({ queryKey: ['notifications', user?.id] }),
    onError: (error) =>
      toast.error(getApiErrorMessage(error, 'Chưa đánh dấu được thông báo đã đọc.')),
  })
  const unread = query.isError ? undefined : query.data?.unread_count
  const unreadIds =
    query.data?.items.filter((item) => !item.read_at).map((item) => item.event_id) ?? []
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={
          query.isError
            ? 'Thông báo không tải được'
            : `Thông báo${unread !== undefined ? `: ${unread} chưa đọc` : ''}`
        }
        className="relative flex size-10 shrink-0 items-center justify-center rounded-lg text-[#34486c] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <Bell className="size-5" />
        {unread !== undefined && unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-0 top-0 min-w-4 rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
        {query.isError && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 size-2 rounded-full bg-amber-500"
          />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold">Thông báo xử lý lỗi</h2>
          <Button
            disabled={mark.isPending || !unreadIds.length || query.isError}
            onClick={() => mark.mutate(unreadIds)}
          >
            Đọc trang này
          </Button>
        </div>
        <div className="mb-2 flex gap-2">
          <Button
            variant={unreadOnly ? 'outline' : 'soft'}
            onClick={() => {
              setUnreadOnly(false)
              setPage(0)
            }}
          >
            Tất cả
          </Button>
          <Button
            variant={unreadOnly ? 'soft' : 'outline'}
            onClick={() => {
              setUnreadOnly(true)
              setPage(0)
            }}
          >
            Chưa đọc
          </Button>
        </div>
        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState
            message={getApiErrorMessage(query.error, 'Không thể tải thông báo.')}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            {!query.data.items.length ? (
              <p className="py-8 text-center text-sm text-slate-500">Không có thông báo phù hợp.</p>
            ) : (
              query.data.items.map((item) => (
                <DropdownMenuItem key={item.event_id} asChild>
                  <Link
                    href={issueNotificationHref(workspace, item.issue_id)}
                    onClick={() => {
                      if (!item.read_at) mark.mutate([item.event_id])
                    }}
                    className="flex flex-col items-start gap-1 border-b border-slate-100 py-3"
                  >
                    <span className="flex w-full items-center gap-2 text-xs text-slate-500">
                      {!item.read_at && (
                        <span
                          aria-label="Chưa đọc"
                          className="size-2 shrink-0 rounded-full bg-indigo-500"
                        />
                      )}
                      {eventNames[item.event_type] ?? 'Yêu cầu được cập nhật'}
                    </span>
                    <span className="text-sm font-semibold">{item.title}</span>
                    <span className="text-xs text-slate-500">
                      {item.department_name} · {formatDateTime(item.created_at)}
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))
            )}
            <div className="mt-3 flex items-center justify-between gap-2">
              <Button disabled={page === 0} onClick={() => setPage(page - 1)}>
                Trang trước
              </Button>
              <span className="text-xs text-slate-500">Trang {page + 1}</span>
              <Button
                disabled={(page + 1) * 10 >= query.data.total}
                onClick={() => setPage(page + 1)}
              >
                Trang sau
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
