'use client'

import type { ComponentType } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Database,
  FileBarChart,
  FileText,
  GitBranch,
  GraduationCap,
  HardDrive,
  History,
  Home,
  KeyRound,
  Layers,
  LayoutDashboard,
  ScrollText,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Table,
  Upload,
  UserPlus,
  Users,
  Workflow,
} from 'lucide-react'

import { ROLE_MENUS } from '@/config/menu'
import { ROLE_DEFINITIONS } from '@/config/roles'
import type { RoleCode } from '@/types/auth'

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  FileText,
  GitBranch,
  Database,
  Layers,
  HardDrive,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  Bot,
  BarChart3,
  Table,
  History,
  GraduationCap,
  UserPlus,
  Home,
  FileBarChart,
  Search,
  ScrollText,
  Sparkles,
  Upload,
  Workflow,
}

interface SidebarProps {
  role: RoleCode
  onCloseMobile?: () => void
}

export function Sidebar({ role, onCloseMobile }: SidebarProps) {
  const pathname = usePathname()
  const roleDef = ROLE_DEFINITIONS[role]
  const menuGroups = ROLE_MENUS[role] ?? []
  // Mục đang mở là mục có đường dẫn dài nhất khớp với URL (vd. /data/sources/new → Nguồn dữ liệu).
  const activeHref = menuGroups
    .flatMap((group) => group.items.map((item) => item.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0]

  return (
    <aside className="flex h-full w-64 flex-col bg-slate-900 p-3 text-slate-400">
      {/* Role Workspace */}
      {/* Trong ngăn kéo mobile, chừa chỗ cho nút đóng ở góc phải. */}
      <div className={`pb-3 pl-2 pt-1.5 ${onCloseMobile ? 'pr-11' : 'pr-2'}`}>
        <p className="font-mono text-[9px] font-medium uppercase tracking-widest text-slate-500">
          Phân hệ vai trò (RBAC)
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate text-xs font-semibold text-white">{roleDef.name}</p>
          <span className="font-mono text-[9px] font-bold text-slate-400">V1.0</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-4 overflow-y-auto" aria-label="Điều hướng chính">
        {menuGroups.map((group, groupIdx) => (
          <div key={group.groupTitle ?? groupIdx}>
            {group.groupTitle && <h3 className="sr-only">{group.groupTitle}</h3>}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const IconComponent = ICON_MAP[item.iconName] ?? LayoutDashboard
                const isActive = item.href === activeHref

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onCloseMobile}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex h-9 items-center gap-2.5 rounded-md px-3 text-[13px] transition-colors ${
                        isActive
                          ? 'bg-indigo-600 font-semibold text-white'
                          : 'font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <IconComponent className="size-4 shrink-0" />
                      <span className="flex-1 truncate">{item.title}</span>
                      {item.badge && (
                        <span
                          className={`rounded px-1.5 py-px font-mono text-[9px] font-bold uppercase ${
                            isActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-indigo-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Lakehouse note */}
      <div className="mt-3 rounded-md bg-slate-800 p-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Kiến trúc dữ liệu</span>
          <span className="font-mono text-[10px] font-bold text-amber-500">Lakehouse</span>
        </div>
        <p className="mt-1 text-[10px] leading-[14px] text-slate-500">
          Bronze (thô) → Silver (chuẩn hoá) → Gold (phân tích)
        </p>
      </div>
    </aside>
  )
}
