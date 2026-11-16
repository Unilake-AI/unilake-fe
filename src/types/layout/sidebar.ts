import type { RoleCode } from '@/types/roles'

export interface SidebarProps {
  role: RoleCode
  onCloseMobile?: () => void
  /** `'auto'`: thu gọn bằng CSS ở khoảng tablet (768–1279px), mở rộng ở màn hình khác. */
  collapsed?: boolean | 'auto'
  onToggleCollapsed?: () => void
}
