'use client'

import { useEffect, useState } from 'react'

import { X } from 'lucide-react'

import { DomainProvider } from '@/hooks/use-domain'
import type { AppShellProps } from '@/types/layout/app-shell'

import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

export function AppShell({ role, children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // 'auto' để CSS tự thu gọn sidebar ở tablet ngay từ lần vẽ đầu (không nhấp nháy).
  // Người dùng bấm nút thì chuyển sang giá trị cố định; đổi khoảng màn hình thì quay về 'auto'.
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean | 'auto'>('auto')

  useEffect(() => {
    const tablet = window.matchMedia('(min-width: 768px) and (max-width: 1279px)')
    const resetToAuto = () => setSidebarCollapsed('auto')
    tablet.addEventListener('change', resetToAuto)
    return () => tablet.removeEventListener('change', resetToAuto)
  }, [])

  // Nút thu gọn chỉ hiện ở tablet, nơi 'auto' đang thu gọn: 'auto' → mở rộng, sau đó đảo qua lại.
  const toggleSidebar = () => setSidebarCollapsed((value) => value === false)

  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileMenuOpen])

  return (
    <DomainProvider role={role}>
      <div className="flex min-h-dvh min-w-0 bg-[#f6f8fc] text-[#101a32] antialiased">
        <div className="sticky top-0 hidden h-dvh shrink-0 md:block">
          <Sidebar role={role} collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebar} />
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-[#081126]/65"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Đóng menu nền"
            />
            <div className="relative h-full max-w-[86vw]">
              <Sidebar role={role} onCloseMobile={() => setMobileMenuOpen(false)} />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="absolute right-3 top-4 z-10 flex size-8 items-center justify-center rounded-lg bg-white/10 text-white"
                aria-label="Đóng menu"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
          <Topbar role={role} onOpenMobile={() => setMobileMenuOpen(true)} />
          <main className="dashboard-content min-w-0 flex-1 bg-[radial-gradient(circle_at_60%_10%,rgba(230,233,255,.55),transparent_55%)] p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </DomainProvider>
  )
}
