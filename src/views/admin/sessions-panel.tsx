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
        <div className="overflow-x-auto">
          <div className="hidden min-w-[840px] grid-cols-[140px_160px_minmax(220px,1fr)_130px_230px] gap-3 rounded-lg bg-[#f0f2ff] px-4 py-3 text-xs font-semibold text-[#34415f] md:grid">
            <span>Phiên</span>
            <span>Thời gian đăng nhập</span>
            <span>Thiết bị / Trình duyệt</span>
            <span>Địa chỉ IP</span>
            <span>Thao tác</span>
          </div>
          <ul className="min-w-[840px] divide-y divide-[#e5e9f3]">
            {sessions.data.map((session) => (
              <li
                key={session.login_session_id}
                className="grid grid-cols-[140px_160px_minmax(220px,1fr)_130px_230px] items-center gap-3 px-4 py-3"
              >
                <strong className="text-xs text-[#111a35]">
                  Phiên #{session.login_session_id}
                </strong>
                <time className="text-xs text-[#596884]">{formatDateTime(session.login_at)}</time>
                <span
                  className="min-w-0 truncate text-xs text-[#34415f]"
                  title={session.user_agent ?? undefined}
                >
                  {session.user_agent ?? 'Không rõ thiết bị'}
                </span>
                <span className="text-xs text-[#596884]">
                  {session.ip_address ?? 'Không rõ IP'}
                </span>
                {confirmId === session.login_session_id ? (
                  <div className="flex gap-1">
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
        </div>
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
