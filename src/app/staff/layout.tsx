import type { ReactNode } from 'react'

import { DepartmentLayout } from '@/components/layout/department-layout'

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <DepartmentLayout workspace="STAFF">{children}</DepartmentLayout>
}
