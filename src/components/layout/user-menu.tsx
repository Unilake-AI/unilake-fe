'use client'

import { useEffect, useId, useRef, useState } from 'react'

import Link from 'next/link'

import { Check, ChevronDown, LogOut, Settings, Shield } from 'lucide-react'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ROLE_DEFINITIONS,
  ROLE_PRIORITY,
  ROLE_ROUTE_PREFIXES,
  getWorkspaceForRole,
} from '@/config/roles'
import { useAuth } from '@/hooks/use-auth'
import type { UserMenuProps } from '@/types/layout/user-menu'
import { SessionsPanel } from '@/views/admin/sessions-panel'

const actionClass =
  'flex h-10 w-full items-center gap-3 rounded-lg px-5 text-left text-sm font-medium transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2'

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'U'
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return `${words[words.length - 2]![0]}${words[words.length - 1]![0]}`.toUpperCase()
}

export function UserMenu({ role, onNavigate }: UserMenuProps) {
  const { user, roles, logout, isLoggingOut } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const actionsId = useId()
  const actions = useRef<HTMLDivElement>(null)
  const displayName = user?.fullName ?? user?.username ?? 'Người dùng'
  const secondaryLine = user?.email ?? user?.username
  const isStaff = getWorkspaceForRole(role) === 'STAFF'
  const switchableRoles = ROLE_PRIORITY.filter((item) => roles.includes(item))

  useEffect(() => {
    if (expanded) actions.current?.scrollIntoView?.({ block: 'nearest' })
  }, [expanded])

  return (
    <div>
      <button
        type="button"
        aria-label="Mở menu người dùng"
        aria-controls={actionsId}
        aria-expanded={expanded}
        title={displayName}
        onClick={() => setExpanded(!expanded)}
        className="group flex h-11 w-full items-center gap-3 overflow-hidden rounded-[10px] px-[18px] text-left text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 aria-expanded:bg-white/10"
      >
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-800"
        >
          {getInitials(displayName)}
        </span>
        <span className="min-w-0 flex-1 items-center justify-between gap-2 pr-0.5 [display:var(--sidebar-label-display,flex)]">
          <span className="min-w-0 truncate">{displayName}</span>
          <ChevronDown
            className="size-4 shrink-0 text-slate-400 transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </span>
      </button>

      <div id={actionsId} ref={actions} hidden={!expanded} className="mt-1 space-y-1">
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Cài đặt"
              title="Cài đặt"
              className={`${actionClass} text-slate-200 hover:text-white`}
            >
              <Settings className="size-5 shrink-0" aria-hidden="true" />
              <span className="[display:var(--sidebar-label-display,flex)]">Cài đặt</span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto rounded-xl bg-white">
            <DialogTitle>Cài đặt tài khoản</DialogTitle>
            <DialogDescription>Thông tin tài khoản và không gian làm việc.</DialogDescription>
            <div className="min-w-0 rounded-lg bg-slate-50 p-3">
              <p className="break-words text-sm font-semibold text-slate-900">{displayName}</p>
              {secondaryLine && secondaryLine !== displayName && (
                <p className="break-words text-xs text-slate-500">{secondaryLine}</p>
              )}
              <p className="mt-1 text-xs font-medium text-slate-600">
                {ROLE_DEFINITIONS[role].name}
              </p>
            </div>

            {switchableRoles.length > 1 && (
              <div>
                <p className="mb-1 text-sm font-medium text-slate-600">
                  Chuyển không gian làm việc
                </p>
                <ul className="space-y-1">
                  {switchableRoles.map((item) => (
                    <li key={item}>
                      <DialogClose asChild>
                        <Link
                          href={ROLE_ROUTE_PREFIXES[item]}
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                          onClick={onNavigate}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        >
                          <Shield className="size-4" aria-hidden="true" />
                          <span className="flex-1">{ROLE_DEFINITIONS[item].name}</span>
                          {item === role && (
                            <Check className="size-4 text-rose-700" aria-label="Đang mở" />
                          )}
                        </Link>
                      </DialogClose>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isStaff ? (
              <DialogClose asChild>
                <Link
                  href="/staff/profile"
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                  onClick={onNavigate}
                  className="text-sm font-medium text-rose-700 hover:underline"
                >
                  Hồ sơ cá nhân và phiên đăng nhập
                </Link>
              </DialogClose>
            ) : (
              <SessionsPanel />
            )}
          </DialogContent>
        </Dialog>
        <button
          type="button"
          aria-label={isLoggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
          title="Đăng xuất"
          disabled={isLoggingOut}
          onClick={() => logout()}
          className={`${actionClass} text-rose-200 hover:text-rose-100 disabled:opacity-50`}
        >
          <LogOut className="size-5 shrink-0" aria-hidden="true" />
          <span className="[display:var(--sidebar-label-display,flex)]">
            {isLoggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </span>
        </button>
      </div>
    </div>
  )
}
