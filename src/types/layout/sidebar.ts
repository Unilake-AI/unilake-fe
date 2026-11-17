import type { RoleCode } from '@/types/roles'

export interface SidebarProps {
  role: RoleCode
  onCloseMobile?: () => void
}
