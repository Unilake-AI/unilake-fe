'use client'

import { DomainProvider } from '@/hooks/use-domain'
import type { AppShellProps } from '@/types/layout/app-shell'

import { WorkspaceNavigation } from './workspace-navigation'

export function AppShell({ role, children }: AppShellProps) {
  return (
    <DomainProvider role={role}>
      <a
        href="#workspace-content"
        data-workspace-surface=""
        className="sr-only z-[70] focus:not-sr-only focus:fixed focus:left-3 focus:top-2 focus:rounded-md focus:bg-card focus:p-3 focus:text-card-foreground"
      >
        Chuyển đến nội dung
      </a>
      <WorkspaceNavigation role={role} />
      <main
        id="workspace-content"
        tabIndex={-1}
        className="dashboard-content workspace-main min-h-dvh min-w-0 bg-background px-3 pb-6 text-foreground antialiased sm:px-6"
      >
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </DomainProvider>
  )
}
