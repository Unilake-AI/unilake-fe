'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Bell, CircleCheck, ClipboardList, FileCheck, X } from 'lucide-react'

import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'

const notifications = [
  {
    id: 'upload-complete',
    title: 'Nạp dữ liệu thành công',
    description: 'Tệp bạn vừa gửi đã được lưu và sẵn sàng để xem.',
    time: '5 phút trước',
    icon: CircleCheck,
    color: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'review-requested',
    title: 'Có tệp cần kiểm tra',
    description: 'Một số dòng trong tệp tháng này cần được xem lại.',
    time: '30 phút trước',
    icon: ClipboardList,
    color: 'bg-amber-50 text-amber-700',
  },
  {
    id: 'report-ready',
    read: true,
    title: 'Báo cáo tháng đã sẵn sàng',
    description: 'Bạn có thể xem bản tổng hợp số liệu tháng này.',
    time: 'Hôm qua',
    icon: FileCheck,
    color: 'bg-indigo-50 text-indigo-700',
  },
]

export function getUnreadNotifications(readIds: ReadonlySet<string>) {
  return notifications.filter(({ id, read }) => !read && !readIds.has(id))
}

export function NotificationButton({
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
      className="flex size-11 items-center justify-center rounded-md text-left text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
    >
      <span className="relative size-5 shrink-0" aria-hidden="true">
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-white ring-2 ring-sidebar">
            {unreadCount}
          </span>
        )}
      </span>
      <span className="sr-only">Thông báo</span>
    </button>
  )
}

export function NotificationPanel({
  open,
  onOpenChange,
  readIds,
  onRead,
  restoreFocus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  readIds: ReadonlySet<string>
  onRead: (ids: string[]) => void
  restoreFocus: () => void
}) {
  const unread = getUnreadNotifications(readIds)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[60] bg-slate-950/35 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            restoreFocus()
          }}
          className="fixed bottom-0 right-0 top-[var(--workspace-header-height)] z-[61] flex w-full max-w-[390px] flex-col bg-white shadow-xl outline-none duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-8 data-[state=open]:slide-in-from-right-8 motion-reduce:animate-none md:border-l md:border-slate-200"
        >
          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-200 px-5 py-4">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
                Thông báo
              </DialogTitle>
              <p className="mt-1 text-xs text-slate-500">Thông báo mẫu</p>
            </div>
            <DialogClose
              aria-label="Đóng thông báo"
              className="grid size-9 shrink-0 place-items-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500"
            >
              <X className="size-5" aria-hidden="true" />
            </DialogClose>
          </div>

          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
            {notifications.map(({ id, title, description, time, icon: Icon, color, read }) => {
              const isRead = read || readIds.has(id)

              return (
                <li key={id}>
                  <button
                    type="button"
                    disabled={isRead}
                    onClick={() => onRead([id])}
                    className={`flex w-full items-start gap-3 rounded-xl p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-rose-500 ${isRead ? '' : 'bg-slate-50 hover:bg-slate-100'}`}
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-full ${color}`}
                      aria-hidden="true"
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">{title}</span>
                      <span className="block text-xs leading-[18px] text-slate-600">
                        {description}
                      </span>
                      <span className="mt-1 block text-[11px] text-slate-500">{time}</span>
                    </span>
                    {!isRead && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary">
                        <span className="sr-only">Chưa đọc</span>
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="border-t border-slate-200 p-3">
            <button
              type="button"
              disabled={unread.length === 0}
              onClick={() => onRead(unread.map(({ id }) => id))}
              className="w-full rounded-lg px-3 py-2 text-sm font-semibold text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500 enabled:hover:bg-rose-50 disabled:text-slate-400"
            >
              Đánh dấu tất cả là đã đọc
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
