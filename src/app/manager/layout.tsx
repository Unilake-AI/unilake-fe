import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'

export default function ManagerLayout({ children }: { children: ReactNode }) {
  return <AppShell role="MANAGER">{children}</AppShell>
}
