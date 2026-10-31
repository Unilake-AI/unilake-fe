import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'

export default function ViewerLayout({ children }: { children: ReactNode }) {
  return <AppShell role="VIEWER">{children}</AppShell>
}
