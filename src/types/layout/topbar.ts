import type { RoleCode } from '@/types/roles'

export interface TopbarProps {
  role: RoleCode
  onOpenMobile?: () => void
}
