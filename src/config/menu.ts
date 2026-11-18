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
        { title: 'Lịch sử nạp Bronze', href: '/data/ingestion', iconName: 'History' },
        { title: 'Giám sát Worker', href: '/data/workers', iconName: 'HardDrive' },
      ],
    },
    {
      groupTitle: 'Xử lý & Chất lượng',
      items: [
        { title: 'Cấu hình Silver (Profiles)', href: '/data/profiles', iconName: 'Settings' },
        { title: 'Giám sát pipeline', href: '/data/auto-pipeline', iconName: 'GitBranch' },
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
      groupTitle: 'TỔNG QUAN & PHÂN TÍCH',
      items: [
        {
          title: 'Tổng quan phòng ban',
          href: '/manager',
          iconName: 'LayoutDashboard',
          description: 'KPI và hiện trạng dữ liệu Gold',
        },
        {
          title: 'Phân tích dữ liệu',
          href: '/manager/analytics',
          iconName: 'BarChart3',
          description: 'Khai thác biểu đồ chuyên sâu',
        },
      ],
    },
    {
      groupTitle: 'QUẢN LÝ DỮ LIỆU',
      items: [
        {
          title: 'Danh sách bộ dữ liệu',
          href: '/manager/catalog',
          iconName: 'FolderGit2',
          description: 'Quản lý catalog phòng ban và lineage',
        },
        {
          title: 'Tạo bộ dữ liệu mới',
          href: '/manager/catalog/create',
          iconName: 'PlusCircle',
          description: 'Quy hoạch bộ dữ liệu chuẩn mực',
        },
      ],
    },
    {
      groupTitle: 'CHẤT LƯỢNG & QUẢN TRỊ',
      items: [
        {
          title: 'Theo dõi chất lượng dữ liệu',
          href: '/manager/issues',
          iconName: 'ShieldCheck',
          description: 'Giám sát xử lý dữ liệu cách ly',
        },
        {
          title: 'Phê duyệt quy tắc',
          href: '/manager/review-queue',
          iconName: 'ClipboardCheck',
          description: 'Phê duyệt quy tắc chuẩn hóa dữ liệu',
        },
      ],
    },
    {
      groupTitle: 'TRỢ LÝ THÔNG MINH',
      items: [
        {
          title: 'Hỏi UniLake AI',
          href: '/manager/ai',
          iconName: 'Bot',
          badge: 'AI',
          description: 'Phân tích và lịch sử truy vấn',
        },
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
  MANAGER: '/manager/ai',
}

export function getMenuItemsForRole(role: RoleCode): MenuItem[] {
  const groups = ROLE_MENUS[getWorkspaceForRole(role)]
  return groups.flatMap((group) => group.items)
}
