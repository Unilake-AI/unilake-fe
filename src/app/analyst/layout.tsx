import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'

export default function AnalystLayout({ children }: { children: ReactNode }) {
  return <AppShell role="ANALYST">{children}</AppShell>
}
