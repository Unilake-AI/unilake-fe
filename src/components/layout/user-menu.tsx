'use client'

import { useEffect, useId, useRef, useState } from 'react'

import Link from 'next/link'

import { ChevronDown, LogOut, Monitor, Moon, Sun, UserRound } from 'lucide-react'
import { useTheme } from 'next-themes'

import { DatabaseLoader } from '@/components/page/page-parts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ROLE_PRIORITY } from '@/config/roles'
import { useAuth } from '@/hooks/use-auth'
import type { UserMenuProps } from '@/types/layout/user-menu'

const actionClass =
  'flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2'

const appearanceOptions = [
  { value: 'system', label: 'Hệ thống', icon: Monitor },
  { value: 'light', label: 'Sáng', icon: Sun },
  { value: 'dark', label: 'Tối', icon: Moon },
] as const

function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const fieldName = useId()

  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Giao diện</legend>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {appearanceOptions.map(({ value, label, icon: Icon }) => (
          <label key={value} className="cursor-pointer">
            <input
              type="radio"
              name={fieldName}
              value={value}
              checked={(theme ?? 'system') === value}
              onChange={() => setTheme(value)}
              className="peer sr-only"
            />
            <span className="flex min-h-10 flex-wrap items-center justify-center gap-x-1 rounded-lg border border-transparent px-1 text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground peer-checked:border-border peer-checked:bg-card peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
              <Icon className="size-3.5 shrink-0" aria-hidden="true" />
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

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
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const displayName = user?.fullName ?? user?.username ?? 'Người dùng'
  const primaryRole = ROLE_PRIORITY.find((item) => roles.includes(item))
  const profileHref = primaryRole && primaryRole !== role ? `/profile?role=${role}` : '/profile'

  useEffect(() => {
    const menu = container.current
    if (!expanded || !menu) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      setExpanded(false)
      trigger.current?.focus()
    }

    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        !document.querySelector('[role=dialog][data-state=open]') &&
        !menu.contains(event.target)
      )
        setExpanded(false)
    }
    menu.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOutside)
    return () => {
      menu.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOutside)
    }
  }, [expanded])

  return (
    <div ref={container} className="relative ml-auto min-w-0">
      <button
        ref={trigger}
        type="button"
        aria-label="Mở menu người dùng"
        aria-controls={actionsId}
        aria-expanded={expanded}
        title={displayName}
        onClick={() => setExpanded(!expanded)}
        className="group flex h-11 max-w-full items-center gap-2 rounded-xl px-2 text-left text-sm font-medium transition-colors hover:bg-foreground/10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 aria-expanded:bg-foreground/10"
      >
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full border border-foreground/15 bg-foreground/10 text-[10px] font-bold"
        >
          {getInitials(displayName)}
        </span>
        <span className="flex min-w-0 max-w-32 items-center gap-2">
          <span className="min-w-0 truncate">{displayName}</span>
          <ChevronDown
            className="hidden size-4 shrink-0 opacity-75 transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none sm:block"
            aria-hidden="true"
          />
        </span>
      </button>

      <div
        id={actionsId}
        hidden={!expanded}
        className="absolute bottom-full right-0 z-10 mb-2 w-52 space-y-1 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl md:bottom-auto md:top-full md:mb-0 md:mt-2"
      >
        <Link
          href={profileHref}
          onNavigate={() => {
            setExpanded(false)
            onNavigate?.()
          }}
          className={actionClass}
        >
          <UserRound className="size-5 shrink-0" aria-hidden="true" />
          Hồ sơ cá nhân
        </Link>
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className={actionClass}>
              <Moon className="size-5 shrink-0" aria-hidden="true" />
              Chế độ giao diện
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-[19rem] gap-3 rounded-xl p-4 sm:rounded-xl">
            <DialogTitle className="px-8 text-center text-base leading-5">
              Chế độ giao diện
            </DialogTitle>
            <DialogDescription className="sr-only">
              Chọn giao diện sáng, tối hoặc theo hệ thống.
            </DialogDescription>
            <AppearanceSettings />
          </DialogContent>
        </Dialog>
        <button
          type="button"
          aria-label={isLoggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
          title="Đăng xuất"
          disabled={isLoggingOut}
          aria-busy={isLoggingOut}
          onClick={() => logout()}
          className={`${actionClass} disabled:opacity-50`}
        >
          {isLoggingOut ? (
            <DatabaseLoader compact />
          ) : (
            <LogOut className="size-5 shrink-0" aria-hidden="true" />
          )}
          <span>{isLoggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</span>
        </button>
      </div>
    </div>
  )
}
