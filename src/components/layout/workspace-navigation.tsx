'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ArrowUpRight01Icon, Cancel01Icon, Menu02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { getMenuItemsForRole } from '@/config/menu'
import { ROLE_DEFINITIONS, getDepartmentDomain, getWorkspaceForRole } from '@/config/roles'
import type { RoleCode } from '@/types/roles'

import { DomainSelector } from './domain-selector'
import { WorkspaceNotifications } from './notifications'
import { UserMenu } from './user-menu'
import logo from '../../../public/logo.png'

const SHORT_VIEWPORT = '(max-height: 560px)'
const COMPACT_PAGE_SIZE = 4

function subscribeToViewport(callback: () => void) {
  const viewport = window.matchMedia?.(SHORT_VIEWPORT)
  viewport?.addEventListener('change', callback)
  return () => viewport?.removeEventListener('change', callback)
}

function isShortViewport() {
  return window.matchMedia?.(SHORT_VIEWPORT).matches ?? false
}

export function WorkspaceNavigation({ role }: { role: RoleCode }) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(0)
  const compact = useSyncExternalStore(subscribeToViewport, isShortViewport, () => false)
  const navigationId = useId()
  const root = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()
  const workspace = getWorkspaceForRole(role)
  const items = getMenuItemsForRole(role)
  const pageCount = compact ? Math.ceil(items.length / COMPACT_PAGE_SIZE) : 1
  const currentPage = Math.min(page, pageCount - 1)
  const visibleItems =
    pageCount > 1
      ? items.slice(currentPage * COMPACT_PAGE_SIZE, (currentPage + 1) * COMPACT_PAGE_SIZE)
      : items
  const activeHref = items
    .map(({ href }) => href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0]
  const showDomainSelector = !getDepartmentDomain(role) && role !== 'DATA_ADMIN'
  const showNotifications = workspace !== 'VIEWER' && workspace !== 'ADMIN'

  useEffect(() => {
    const navigation = root.current
    if (!open || !navigation) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      setOpen(false)
      trigger.current?.focus()
    }

    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        !navigation.contains(event.target) &&
        !event.target.closest('[data-radix-popper-content-wrapper]') &&
        !document.querySelector('[role="dialog"][data-state="open"]')
      ) {
        setOpen(false)
      }
    }

    function closeOnHistoryChange() {
      setOpen(false)
    }

    navigation.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOutside)
    window.addEventListener('popstate', closeOnHistoryChange)
    return () => {
      navigation.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('popstate', closeOnHistoryChange)
    }
  }, [open])

  return (
    <header
      ref={root}
      data-open={open}
      className="workspace-header fixed inset-x-3 top-3 z-40 mx-auto grid max-h-[calc(100dvh-1.5rem)] max-w-5xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center rounded-[1.875rem] border px-2 text-foreground sm:inset-x-6 sm:px-3"
    >
      <button
        ref={trigger}
        type="button"
        aria-controls={navigationId}
        aria-expanded={open}
        onClick={() => {
          if (!open) setPage(0)
          setOpen(!open)
        }}
        className="col-start-1 row-start-1 flex h-11 items-center gap-2 justify-self-start rounded-xl px-2 text-sm font-medium transition-colors hover:bg-foreground/10 aria-expanded:bg-foreground/10 motion-reduce:transition-none sm:px-3"
      >
        <HugeiconsIcon icon={open ? Cancel01Icon : Menu02Icon} className="size-5" aria-hidden />
        {open ? 'Đóng' : 'Menu'}
      </button>

      <Link
        href={ROLE_DEFINITIONS[role].homePath}
        onNavigate={() => setOpen(false)}
        className="col-start-2 row-start-1 flex h-11 items-center gap-1.5 rounded-lg px-1.5 text-sm font-semibold tracking-tight sm:gap-2 sm:text-base"
      >
        <Image src={logo} alt="" width={32} height={32} className="size-8 object-contain" />
        <span>UniLake AI</span>
      </Link>

      <nav
        id={navigationId}
        aria-label="Điều hướng chính"
        aria-hidden={!open}
        inert={!open}
        className="workspace-navigation-panel col-span-3 row-start-2 min-h-0 self-stretch overflow-clip"
      >
        <div className="border-t border-foreground/10 py-2">
          {showDomainSelector && (
            <div className="mb-2 w-full rounded-xl border border-foreground/10 bg-foreground/5 sm:w-64">
              <DomainSelector />
            </div>
          )}
          <ul className="grid auto-rows-fr grid-cols-2 gap-2 lg:grid-cols-4">
            {visibleItems.map(({ href, title }) => (
              <li key={href} className="min-w-0">
                <Link
                  href={href}
                  onNavigate={() => setOpen(false)}
                  aria-current={href === activeHref ? 'page' : undefined}
                  className="flex h-full min-h-12 items-center justify-between gap-2 rounded-xl border border-foreground/15 bg-foreground/5 p-2 text-xs leading-snug transition-colors hover:border-foreground/30 hover:bg-foreground/10 aria-[current=page]:border-foreground/40 aria-[current=page]:bg-foreground/10 aria-[current=page]:font-semibold motion-reduce:transition-none sm:px-3 sm:text-sm"
                >
                  {title}
                  <HugeiconsIcon
                    icon={ArrowUpRight01Icon}
                    className="hidden size-4 shrink-0 opacity-75 sm:block"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
          {pageCount > 1 && (
            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
                className="min-h-8 rounded-lg px-2 hover:bg-foreground/10 disabled:opacity-50"
              >
                Trang trước
              </button>
              <span aria-live="polite">
                {currentPage + 1} / {pageCount}
              </span>
              <button
                type="button"
                disabled={currentPage === pageCount - 1}
                onClick={() => setPage(currentPage + 1)}
                className="min-h-8 rounded-lg px-2 hover:bg-foreground/10 disabled:opacity-50"
              >
                Trang sau
              </button>
            </div>
          )}
        </div>
      </nav>

      <div
        className={`col-span-3 row-start-3 items-center justify-between gap-1 border-t border-foreground/10 py-1.5 md:col-span-1 md:col-start-3 md:row-start-1 md:justify-self-end md:border-0 md:p-0 ${open ? 'flex' : 'hidden md:flex'}`}
      >
        {showNotifications && (
          <WorkspaceNotifications workspace={workspace} fallbackFocus={trigger} />
        )}
        <UserMenu role={role} onNavigate={() => setOpen(false)} />
      </div>
    </header>
  )
}
