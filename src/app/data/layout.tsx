import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'

export default function DataLayout({ children }: { children: ReactNode }) {
  return <AppShell role="DATA_ADMIN">{children}</AppShell>
}
