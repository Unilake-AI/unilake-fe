import type { MenuGroup, MenuItem, RoleCode } from '@/types/auth'

/** Menu sidebar theo bản thiết kế Figma "UniLake AI – Frontend" (mỗi vai trò một nhóm). */
export const ROLE_MENUS: Record<RoleCode, MenuGroup[]> = {
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
      groupTitle: 'Quản trị dữ liệu',
      items: [
        { title: 'Nguồn dữ liệu', href: '/data', iconName: 'Database' },
        { title: 'Nạp dữ liệu (Ingestion)', href: '/data/ingestion', iconName: 'Upload' },
        { title: 'Data Catalog', href: '/data/catalog', iconName: 'BookOpen' },
        { title: 'Data Quality', href: '/data/quality', iconName: 'ShieldCheck' },
        { title: 'Data Lineage', href: '/data/lineage', iconName: 'Workflow' },
        { title: 'Hỏi AI (NLQ)', href: '/data/ask', iconName: 'Sparkles', badge: 'AI' },
      ],
    },
  ],

  ANALYST: [
    {
      groupTitle: 'Phân tích & Khai phá',
      items: [
        { title: 'Tổng quan phân hệ', href: '/analyst', iconName: 'LayoutDashboard' },
        { title: 'Hỏi AI (NLQ)', href: '/analyst/ask', iconName: 'Sparkles', badge: 'AI' },
        { title: 'Khám phá dữ liệu', href: '/analyst/explore', iconName: 'Table' },
        { title: 'Lịch sử truy vấn', href: '/analyst/history', iconName: 'History' },
      ],
    },
  ],

  MANAGER: [
    {
      groupTitle: 'Quản lý đơn vị',
      items: [
        { title: 'Tổng quan phân hệ', href: '/manager', iconName: 'LayoutDashboard' },
        { title: 'Phân tích & So sánh', href: '/manager/analytics', iconName: 'BarChart3' },
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
        { title: 'Hỏi AI (NLQ)', href: '/viewer/ask', iconName: 'Sparkles', badge: 'AI' },
        { title: 'Lịch sử truy vấn', href: '/viewer/history', iconName: 'History' },
      ],
    },
  ],
}

/** Trang Hỏi AI của từng vai trò; ADMIN không có (nút Ask AI trên header bị ẩn). */
export const ASK_AI_PATHS: Partial<Record<RoleCode, string>> = {
  DATA_ADMIN: '/data/ask',
  ANALYST: '/analyst/ask',
  MANAGER: '/manager/ask',
  VIEWER: '/viewer/ask',
}

export function getMenuItemsForRole(role: RoleCode): MenuItem[] {
  const groups = ROLE_MENUS[role] ?? []
  return groups.flatMap((group) => group.items)
}
