'use client'

import { useEffect, useRef, useState } from 'react'

import Image from 'next/image'

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
import { getWorkspaceForRole } from '@/config/roles'
import { DomainProvider } from '@/hooks/use-domain'
import type { AppShellProps } from '@/types/layout/app-shell'

import { WorkspaceNotifications } from './notifications'
import { Sidebar } from './sidebar'
import { UserMenu } from './user-menu'
import logoText from '../../../public/logo_text.png'

const DESKTOP_NAV = '(min-width: 768px) and (hover: hover) and (pointer: fine)'

export function AppShell({ role, children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileNavigationTrigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_NAV)
    const closeMobileMenu = () => {
      if (desktop.matches) setMobileMenuOpen(false)
    }
    desktop.addEventListener('change', closeMobileMenu)
    return () => desktop.removeEventListener('change', closeMobileMenu)
  }, [])

  const workspace = getWorkspaceForRole(role)

  return (
    <DomainProvider role={role}>
      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <a
          href="#workspace-content"
          className="sr-only z-[70] focus:not-sr-only focus:fixed focus:left-3 focus:top-2 focus:rounded-md focus:bg-white focus:p-3"
        >
          Chuyển đến nội dung
        </a>
        <header className="workspace-header fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 border-b border-white/10 bg-sidebar px-3 text-white sm:px-5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <DialogTrigger asChild>
              <button
                ref={mobileNavigationTrigger}
                type="button"
                className="workspace-menu-button grid size-11 shrink-0 place-items-center rounded-md hover:bg-white/10"
                aria-label="Mở menu điều hướng"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
            </DialogTrigger>
            <Image
              src={logoText}
              alt="UniLake AI"
              priority
              className="h-auto w-28 object-contain sm:w-36"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {workspace !== 'VIEWER' && workspace !== 'ADMIN' && (
              <WorkspaceNotifications
                workspace={workspace}
                fallbackFocus={mobileNavigationTrigger}
              />
            )}
            <UserMenu role={role} />
          </div>
        </header>

        <div className="workspace-rail fixed left-0 z-30">
          <Sidebar role={role} />
        </div>

        <main
          id="workspace-content"
          tabIndex={-1}
          className="dashboard-content workspace-main min-h-dvh min-w-0 bg-background px-3 pb-6 text-foreground antialiased sm:px-6"
        >
          {children}
        </main>

        <DialogPortal>
          <DialogOverlay className="workspace-menu-overlay bg-slate-950/45 motion-reduce:animate-none" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="workspace-mobile-menu fixed bottom-0 left-0 z-50 w-60 max-w-[86vw] bg-sidebar pt-12 outline-none motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:slide-in-from-left-4"
          >
            <DialogTitle className="sr-only">Menu điều hướng</DialogTitle>
            <DialogClose
              className="absolute right-2 top-1 grid size-10 place-items-center rounded-md text-white hover:bg-white/10"
              aria-label="Đóng menu"
            >
              <X className="size-5" aria-hidden="true" />
            </DialogClose>
            <Sidebar role={role} onCloseMobile={() => setMobileMenuOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </DomainProvider>
  )
}
