'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

import { X } from 'lucide-react'

import { DomainProvider } from '@/hooks/use-domain'
import type { RoleCode } from '@/types/auth'

import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

interface AppShellProps {
  role: RoleCode
  children: ReactNode
}

export function AppShell({ role, children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <DomainProvider>
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased">
        <Topbar role={role} onOpenMobile={() => setMobileMenuOpen(true)} />

        <div className="flex min-h-0 flex-1">
          {/* Desktop Sidebar */}
          <div className="sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 md:block">
            <Sidebar role={role} />
          </div>

          {/* Mobile Sidebar Backdrop & Drawer */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-40 flex md:hidden">
              <button
                type="button"
                className="fixed inset-0 bg-slate-950/60"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Đóng menu nền"
              />
              <div className="relative z-50 flex h-full max-w-[85vw] flex-col">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="absolute right-3 top-3 z-50 flex size-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                  aria-label="Đóng menu"
                >
                  <X className="size-4" />
                </button>
                <Sidebar role={role} onCloseMobile={() => setMobileMenuOpen(false)} />
              </div>
            </div>
          )}

          {/* Main Body */}
          <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </DomainProvider>
  )
}
