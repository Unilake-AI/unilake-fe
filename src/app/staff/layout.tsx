import type { ReactNode } from 'react'

import { DepartmentLayout } from '@/components/layout/department-layout'
import { StaffUploadDialog } from '@/views/staff/staff-upload-view'

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <DepartmentLayout workspace="STAFF">
      {children}
      <StaffUploadDialog />
    </DepartmentLayout>
  )
}
