import type { ReactNode } from 'react'

import type { RoleCode } from '@/types/roles'

export interface AppShellProps {
  role: RoleCode
  children: ReactNode
}
