import { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { API_ListSessions, API_RevokeSession } from '@/api/auth/sessions'
import { getApiErrorMessage } from '@/api/http'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  formatDateTime,
} from '@/components/page/page-parts'
import { useAuth } from '@/hooks/use-auth'

export function SessionsPanel() {
  const { user, isLoading: isUserLoading } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = ['auth', 'sessions', user?.id] as const
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const sessions = useQuery({
    queryKey,
    queryFn: API_ListSessions,
    enabled: user?.id !== undefined,
  })
  const revoke = useMutation({
    mutationFn: API_RevokeSession,
    onSuccess: async () => {
      setConfirmId(null)
      await queryClient.invalidateQueries({ queryKey })
    },
  })

  return (
    <Card
      title="Phiên đăng nhập của tôi"
      subtitle="Các phiên đang hoạt động của tài khoản hiện tại"
    >
      {isUserLoading || sessions.isLoading ? (
        <LoadingState />
      ) : sessions.isError ? (
        <ErrorState
          message={getApiErrorMessage(sessions.error, 'Không tải được phiên đăng nhập.')}
          onRetry={() => void sessions.refetch()}
        />
      ) : sessions.data?.length ? (
        <ul className="divide-y divide-slate-100">
          {sessions.data.map((session) => (
            <li
              key={session.login_session_id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0 text-xs">
                <p className="font-semibold text-slate-900">
                  Phiên #{session.login_session_id} · {formatDateTime(session.login_at)}
                </p>
                <p className="break-words text-slate-600">
                  {session.ip_address ?? 'Không rõ IP'} ·{' '}
                  {session.user_agent ?? 'Không rõ thiết bị'}
                </p>
              </div>
              {confirmId === session.login_session_id ? (
                <div className="flex gap-2">
                  <Button disabled={revoke.isPending} onClick={() => setConfirmId(null)}>
                    Hủy
                  </Button>
                  <Button
                    variant="primary"
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(session.login_session_id)}
                  >
                    {revoke.isPending ? 'Đang thu hồi…' : 'Xác nhận thu hồi'}
                  </Button>
                </div>
              ) : (
                <Button
                  disabled={revoke.isPending}
                  onClick={() => {
                    revoke.reset()
                    setConfirmId(session.login_session_id)
                  }}
                >
                  Thu hồi phiên
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : sessions.isSuccess ? (
        <EmptyState title="Không có phiên đang hoạt động" />
      ) : (
        <EmptyState title="Chưa xác định được tài khoản hiện tại" />
      )}
      {revoke.isError && (
        <p role="alert" className="mt-2 text-xs text-rose-600">
          {getApiErrorMessage(revoke.error, 'Không thu hồi được phiên đăng nhập.')}
        </p>
      )}
    </Card>
  )
}
