'use client'

import { useRef, useState } from 'react'
import type { RefObject } from 'react'

import Link from 'next/link'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, ClipboardList, X } from 'lucide-react'

import { getApiErrorMessage } from '@/api/http'
import {
  API_ListNotifications,
  API_MarkNotificationsRead,
  API_MarkStaffNotificationRead,
} from '@/api/shared/notifications'
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/use-auth'
import type { RoleWorkspace } from '@/types/roles'

function NotificationButton({
  unreadCount,
  open,
  onOpen,
}: {
  unreadCount: number
  open: boolean
  onOpen: (trigger: HTMLButtonElement) => void
}) {
  return (
    <button
      type="button"
      onClick={(event) => onOpen(event.currentTarget)}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={unreadCount ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
      className="flex h-11 items-center justify-center gap-2 rounded-xl px-2.5 text-left text-sm font-medium transition-colors hover:bg-foreground/10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 md:w-11 md:px-0"
    >
      <span className="relative size-5 shrink-0" aria-hidden="true">
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground ring-2 ring-background">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </span>
      <span aria-hidden="true" className="md:hidden">
        Thông báo
      </span>
    </button>
  )
}

export function WorkspaceNotifications({
  workspace,
  fallbackFocus,
  onNavigate,
}: {
  workspace: Exclude<RoleWorkspace, 'VIEWER'>
  fallbackFocus: RefObject<HTMLButtonElement | null>
  onNavigate?: () => void
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [offset, setOffset] = useState(0)
  const queryKey = ['notifications', user?.id ?? user?.username, workspace]
  const summary = useQuery({
    queryKey: [...queryKey, 0],
    queryFn: () => API_ListNotifications(workspace, 0),
    enabled: Boolean(user),
    refetchInterval: 30_000,
  })
  const laterPage = useQuery({
    queryKey: [...queryKey, offset],
    queryFn: () => API_ListNotifications(workspace, offset),
    enabled: Boolean(user) && open && offset > 0,
    refetchInterval: 30_000,
  })
  const page = offset === 0 ? summary : laterPage
  const markRead = useMutation({
    mutationFn: (ids: number[]) =>
      workspace === 'STAFF' && ids.length === 1
        ? API_MarkStaffNotificationRead(ids[0]!)
        : API_MarkNotificationsRead(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })
  const items = page.data?.items ?? []
  const unreadIds = items
    .filter((item) => !(item.is_read ?? item.read_at))
    .map((item) => item.event_id)

  return (
    <>
      <NotificationButton
        unreadCount={summary.data?.unread_count ?? 0}
        open={open}
        onOpen={(button) => {
          trigger.current = button
          markRead.reset()
          setOffset(0)
          setOpen(true)
        }}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogOverlay className="z-[60] bg-slate-950/35 motion-reduce:animate-none" />
          <DialogPrimitive.Content
            data-workspace-surface=""
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              if (trigger.current?.getClientRects().length) trigger.current.focus()
              else fallbackFocus.current?.focus()
            }}
            className="fixed bottom-0 right-0 top-[var(--workspace-header-height)] z-[61] flex w-full max-w-[390px] flex-col bg-card text-card-foreground shadow-xl outline-none duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-8 data-[state=open]:slide-in-from-right-8 motion-reduce:animate-none md:border-l md:border-slate-200"
          >
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-200 px-5 py-4">
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
                  Thông báo
                </DialogTitle>
              </div>
              <DialogClose
                aria-label="Đóng thông báo"
                className="grid size-9 shrink-0 place-items-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500"
              >
                <X className="size-5" aria-hidden="true" />
              </DialogClose>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {page.isPending && (
                <p role="status" className="p-3 text-sm">
                  Đang tải thông báo…
                </p>
              )}
              {page.isError && (
                <div className="space-y-2 p-3 text-sm">
                  <p role="alert">{getApiErrorMessage(page.error, 'Không tải được thông báo.')}</p>
                  <button
                    type="button"
                    className="font-semibold text-rose-700"
                    onClick={() => void page.refetch()}
                  >
                    Thử lại
                  </button>
                </div>
              )}
              {page.isSuccess && items.length === 0 && (
                <p className="p-3 text-sm text-slate-600">Chưa có thông báo.</p>
              )}
              <ul className="space-y-1">
                {items.map((item) => {
                  const isRead = item.is_read ?? Boolean(item.read_at)
                  return (
                    <li
                      key={item.event_id}
                      className={`flex items-start gap-3 rounded-xl p-3 ${isRead ? '' : 'bg-slate-50'}`}
                    >
                      <ClipboardList
                        className="mt-0.5 size-5 shrink-0 text-rose-700"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        {workspace === 'STAFF' ? (
                          <Link
                            href={`/staff/quality-issues/${encodeURIComponent(item.issue_id)}`}
                            onNavigate={() => {
                              setOpen(false)
                              onNavigate?.()
                            }}
                            className="block break-words text-sm font-semibold text-slate-900 hover:underline"
                          >
                            {item.title}
                          </Link>
                        ) : (
                          <p className="break-words text-sm font-semibold text-slate-900">
                            {item.title}
                          </p>
                        )}
                        {item.message && (
                          <p className="mt-1 text-xs text-slate-700">{item.message}</p>
                        )}
                        <p className="mt-1 text-xs text-slate-600">{item.department_name}</p>
                        <time
                          dateTime={item.created_at}
                          className="mt-1 block text-xs text-slate-500"
                        >
                          {new Date(item.created_at).toLocaleString('vi-VN')}
                        </time>
                        {!isRead && (
                          <button
                            type="button"
                            disabled={markRead.isPending}
                            onClick={() => markRead.mutate([item.notification_id ?? item.event_id])}
                            className="mt-2 text-xs font-semibold text-rose-700 hover:underline disabled:opacity-50"
                          >
                            Đánh dấu đã đọc
                          </button>
                        )}
                      </div>
                      {!isRead && (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary">
                          <span className="sr-only">Chưa đọc</span>
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="space-y-2 border-t border-slate-200 p-3 text-sm">
              {markRead.isError && (
                <p role="alert" className="text-rose-700">
                  {getApiErrorMessage(markRead.error, 'Không cập nhật được trạng thái đã đọc.')}
                </p>
              )}
              {offset > 0 || (page.data && page.data.total > items.length) ? (
                <nav aria-label="Phân trang thông báo" className="flex justify-between gap-3">
                  <button
                    type="button"
                    disabled={offset === 0}
                    onClick={() => setOffset(offset - 20)}
                    className="disabled:text-slate-400"
                  >
                    Trang trước
                  </button>
                  <button
                    type="button"
                    disabled={!page.data || offset + 20 >= page.data.total}
                    onClick={() => setOffset(offset + 20)}
                    className="disabled:text-slate-400"
                  >
                    Trang sau
                  </button>
                </nav>
              ) : null}
              <button
                type="button"
                disabled={unreadIds.length === 0 || markRead.isPending}
                onClick={() => markRead.mutate(unreadIds)}
                className="w-full rounded-lg px-3 py-2 font-semibold text-rose-700 enabled:hover:bg-rose-50 disabled:text-slate-400"
              >
                Đánh dấu đã đọc trên trang này
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  )
}
