'use client'

import { useEffect, useRef, useState } from 'react'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Menu, X } from 'lucide-react'

import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DomainProvider } from '@/hooks/use-domain'
import type { AppShellProps } from '@/types/layout/app-shell'

import { NotificationButton, NotificationPanel, getUnreadNotifications } from './notifications'
import { Sidebar } from './sidebar'
import { UserMenu } from './user-menu'

const TABLET_QUERY = '(min-width: 768px) and (max-width: 1279px)'

export function AppShell({ role, children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean | 'auto'>('auto')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationTrigger = useRef<HTMLButtonElement>(null)
  const mobileNavigationTrigger = useRef<HTMLButtonElement>(null)
  const [readIds, setReadIds] = useState(() => new Set<string>())

  function markRead(ids: string[]) {
    setReadIds((current) => new Set([...current, ...ids]))
  }

  const notificationButton = (
    <NotificationButton
      unreadCount={getUnreadNotifications(readIds).length}
      open={notificationsOpen}
      onOpen={(trigger) => {
        notificationTrigger.current = trigger
        setNotificationsOpen(true)
      }}
    />
  )

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)')
    const closeMobileMenu = () => {
      if (desktop.matches) setMobileMenuOpen(false)
    }
    desktop.addEventListener('change', closeMobileMenu)
    return () => desktop.removeEventListener('change', closeMobileMenu)
  }, [])

  function toggleSidebar() {
    const tablet = window.matchMedia(TABLET_QUERY).matches
    setSidebarCollapsed((value) => !(value === 'auto' ? tablet : value))
  }

  return (
    <DomainProvider role={role}>
      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <div className="flex min-h-dvh min-w-0 bg-[#f6f8fc] text-[#101a32] antialiased">
          <div className="sticky top-0 hidden h-dvh shrink-0 md:block">
            <Sidebar
              role={role}
              collapsed={notificationsOpen || sidebarCollapsed}
              onToggleCollapsed={toggleSidebar}
              actions={
                <>
                  {notificationButton}
                  <UserMenu role={role} />
                </>
              }
            />
          </div>

          <main className="dashboard-content min-w-0 flex-1 bg-[radial-gradient(circle_at_60%_10%,rgba(230,233,255,.55),transparent_55%)] p-4 md:p-6">
            <div className="mb-4 md:hidden">
              <DialogTrigger asChild>
                <button
                  ref={mobileNavigationTrigger}
                  type="button"
                  className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-100"
                  aria-label="Mở menu điều hướng"
                >
                  <Menu className="size-5" aria-hidden="true" />
                </button>
              </DialogTrigger>
            </div>
            {children}
          </main>
        </div>

        <DialogPortal>
          <DialogOverlay className="bg-[#081126]/65 duration-200 motion-reduce:animate-none md:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 max-w-[86vw] outline-none duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left-full data-[state=open]:slide-in-from-left-full motion-reduce:animate-none md:hidden"
          >
            <DialogTitle className="sr-only">Menu điều hướng</DialogTitle>
            <DialogClose
              className="absolute right-3 top-5 z-10 flex size-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
              aria-label="Đóng menu"
            >
              <X className="size-5" aria-hidden="true" />
            </DialogClose>
            <Sidebar
              role={role}
              onCloseMobile={() => setMobileMenuOpen(false)}
              actions={
                <>
                  {notificationButton}
                  <UserMenu role={role} onNavigate={() => setMobileMenuOpen(false)} />
                </>
              }
            />
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
      <NotificationPanel
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        readIds={readIds}
        onRead={markRead}
        restoreFocus={() => {
          const trigger = notificationTrigger.current
          if (trigger?.getClientRects().length) {
            trigger.focus()
          } else {
            mobileNavigationTrigger.current?.focus()
          }
        }}
      />
    </DomainProvider>
  )
}
