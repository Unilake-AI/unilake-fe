import { getWorkspaceForRole } from '@/config/roles'
import type { MenuGroup, MenuItem } from '@/types/navigation'
import type { RoleCode, RoleWorkspace } from '@/types/roles'

/** Sáu role phòng ban dùng hai không gian làm việc theo chức năng. */
export const ROLE_MENUS: Record<RoleWorkspace, MenuGroup[]> = {
  ADMIN: [
    {
      groupTitle: 'Quản trị hệ thống',
      items: [
        { title: 'Người dùng & Phân quyền', href: '/admin', iconName: 'Users' },
        { title: 'Cấu hình hệ thống & AI', href: '/admin/settings', iconName: 'Settings' },
        { title: 'Nhật ký hệ thống', href: '/admin/system-logs', iconName: 'ScrollText' },
      ],
    },
  ],

  DATA_ADMIN: [
    {
      groupTitle: 'Tổng quan',
      items: [{ title: 'Tổng quan hệ thống', href: '/data', iconName: 'LayoutDashboard' }],
    },
    {
      groupTitle: 'Quản lý dữ liệu',
      items: [
        { title: 'Nguồn dữ liệu', href: '/data/sources', iconName: 'Database' },
        { title: 'Bộ dữ liệu (Datasets)', href: '/data/datasets', iconName: 'Layers' },
        { title: 'Giám sát Worker', href: '/data/workers', iconName: 'HardDrive' },
      ],
    },
    {
      groupTitle: 'Xử lý & Chất lượng',
      items: [
        { title: 'Cấu hình Silver (Profiles)', href: '/data/profiles', iconName: 'Settings' },
        { title: 'Làm sạch & Kiểm tra', href: '/data/cleaning', iconName: 'Play' },
        { title: 'Hồ sơ cách ly (Quarantine)', href: '/data/quarantine', iconName: 'FileWarning' },
        { title: 'Yêu cầu xử lý dữ liệu lỗi', href: '/data/quality', iconName: 'ShieldCheck' },
        { title: 'Phiên bản Silver (Snapshots)', href: '/data/silver', iconName: 'CheckCircle2' },
        { title: 'Tổng hợp & Báo cáo Gold', href: '/data/gold', iconName: 'BarChart3' },
      ],
    },
    {
      groupTitle: 'Quản trị siêu dữ liệu',
      items: [
        { title: 'Data Catalog', href: '/data/catalog', iconName: 'BookOpen' },
        { title: 'Data Lineage', href: '/data/lineage', iconName: 'Workflow' },
      ],
    },
  ],

  STAFF: [
    {
      groupTitle: 'Vận hành dữ liệu',
      items: [
        { title: 'Tổng quan', href: '/staff', iconName: 'LayoutDashboard' },
        { title: 'Nạp dữ liệu', href: '/staff/upload', iconName: 'Upload' },
        { title: 'Lịch sử nạp dữ liệu', href: '/staff/ingestion', iconName: 'History' },
        {
          title: 'Yêu cầu xử lý dữ liệu lỗi',
          href: '/staff/quality-issues',
          iconName: 'ShieldCheck',
        },
      ],
    },
  ],

  MANAGER: [
    {
      groupTitle: 'Quản lý đơn vị',
      items: [
        { title: 'Tổng quan phân hệ', href: '/manager', iconName: 'LayoutDashboard' },
        { title: 'Phân tích dữ liệu', href: '/manager/analytics', iconName: 'BarChart3' },
        { title: 'Bộ dữ liệu phòng ban', href: '/manager/datasets', iconName: 'Database' },
        { title: 'Yêu cầu sửa dữ liệu', href: '/manager/quality-issues', iconName: 'FileWarning' },
        { title: 'Hỏi AI (NLQ)', href: '/manager/ask', iconName: 'Sparkles', badge: 'AI' },
        { title: 'Lịch sử truy vấn', href: '/manager/history', iconName: 'History' },
      ],
    },
  ],

  VIEWER: [
    {
      groupTitle: 'Điều hành',
      items: [
        { title: 'Tổng quan điều hành', href: '/viewer', iconName: 'LayoutDashboard' },
        { title: 'Dashboard theo phân hệ', href: '/viewer/dashboards', iconName: 'BarChart3' },
      ],
    },
  ],
}

/** Chỉ mở Ask AI cho MANAGER khi còn trong menu; DATA_ADMIN và STAFF tập trung vào vận hành dữ liệu. */
export const ASK_AI_PATHS: Partial<Record<RoleWorkspace, string>> = {
  MANAGER: '/manager/ask',
}

export function getMenuItemsForRole(role: RoleCode): MenuItem[] {
  const groups = ROLE_MENUS[getWorkspaceForRole(role)]
  return groups.flatMap((group) => group.items)
}
