import type { ReactNode } from 'react'

import { DepartmentLayout } from '@/components/layout/department-layout'

export default function ManagerLayout({ children }: { children: ReactNode }) {
  return <DepartmentLayout workspace="MANAGER">{children}</DepartmentLayout>
}
