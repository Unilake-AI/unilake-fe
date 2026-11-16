'use client'

import type { ComponentType } from 'react'

import Image from 'next/image'
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
  FileWarning,
  GitBranch,
  GraduationCap,
  HardDrive,
  History,
  Home,
  KeyRound,
  Layers,
  LayoutDashboard,
  Play,
  ScrollText,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Table,
  Upload,
  User,
  UserPlus,
  Users,
  Workflow,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

import campusImage from '@/assets/login/duy-tan-campus-source.png'
import { ROLE_MENUS } from '@/config/menu'
import { ROLE_DEFINITIONS, getWorkspaceForRole } from '@/config/roles'
import type { SidebarProps } from '@/types/layout/sidebar'

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
  FileWarning,
  Play,
  Search,
  ScrollText,
  Sparkles,
  Upload,
  User,
  Workflow,
}

function SidebarCampusArtwork() {
  return (
    <div className="relative h-40 shrink-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-[#1e3456] via-[#709ac5] to-[#c9dfed]" />
      <Image
        src={campusImage}
        alt=""
        fill
        sizes="275px"
        className="object-cover object-[51%_64%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_24%,black_100%)]"
      />
      <div className="absolute -top-12 left-[-15%] h-20 w-[140%] rotate-[-8deg] rounded-[50%] border-b-[9px] border-[#bd1931] bg-[#101b32]" />
    </div>
  )
}

export function Sidebar({
  role,
  onCloseMobile,
  collapsed = false,
  onToggleCollapsed,
}: SidebarProps) {
  const pathname = usePathname()
  const roleDef = ROLE_DEFINITIONS[role]
  const menuGroups = ROLE_MENUS[getWorkspaceForRole(role)]
  // Mục đang mở là mục có đường dẫn dài nhất khớp với URL (vd. /data/sources/new → Nguồn dữ liệu).
  const activeHref = menuGroups
    .flatMap((group) => group.items.map((item) => item.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0]

  // 'auto' thu gọn bằng CSS ở khoảng tablet (768–1279px) nên không nhấp nháy khi tải trang.
  // Tailwind chỉ sinh class viết nguyên văn, nên mỗi biến thể được liệt kê đầy đủ.
  const asideWidth =
    collapsed === true
      ? 'w-[76px]'
      : collapsed === 'auto'
        ? 'w-[280px] max-w-[86vw] md:max-xl:w-[76px]'
        : 'w-[280px] max-w-[86vw]'
  const hideWhenCollapsed =
    collapsed === true ? 'hidden' : collapsed === 'auto' ? 'md:max-xl:hidden' : ''
  const showWhenCollapsed =
    collapsed === true ? '' : collapsed === 'auto' ? 'hidden md:max-xl:block' : 'hidden'
  const centerWhenCollapsed =
    collapsed === true
      ? 'justify-center px-2'
      : collapsed === 'auto'
        ? 'md:max-xl:justify-center md:max-xl:px-2'
        : ''

  return (
    <aside
      className={`flex h-full flex-col overflow-hidden bg-[#101b32] text-[#aeb9cd] transition-[width] duration-200 ${asideWidth}`}
    >
      <div
        className={`relative flex h-[76px] shrink-0 items-center gap-2.5 border-b border-white/10 px-4 ${centerWhenCollapsed}`}
      >
        <Image
          src="/logo.png"
          alt="UniLake AI"
          width={48}
          height={48}
          className="size-12 shrink-0 object-contain"
        />
        <div className={`min-w-0 flex-1 ${hideWhenCollapsed}`}>
          <div className="truncate text-[21px] font-bold leading-6 tracking-tight text-white">
            UniLake <span className="text-[#efad35]">AI</span>
          </div>
          <div className="truncate text-[10px] font-semibold tracking-[.07em] text-white/80">
            DUY TÂN UNIVERSITY
          </div>
        </div>
        <span
          className={`rounded-md bg-white/10 px-1.5 py-0.5 text-xs font-bold text-white/90 ${onCloseMobile ? 'hidden' : hideWhenCollapsed}`}
        >
          v1.0
        </span>
        <span className="absolute bottom-0 right-0 h-1 w-20 rounded-t-full bg-[#bd1931]" />
      </div>
      {/* Role Workspace */}
      <div className={`px-7 pb-3 pt-5 ${hideWhenCollapsed}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-[#a8b1c5]">
          Phân hệ vai trò (RBAC)
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-white">{roleDef.name}</p>
          <span className="text-xs font-bold text-white/85">v1.0</span>
        </div>
      </div>
      {onToggleCollapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="mx-3 mb-2 hidden items-center justify-center gap-2 rounded-lg p-1.5 text-xs text-white/70 hover:bg-white/10 md:flex xl:hidden"
          // Nút chỉ hiện ở tablet, nơi chế độ 'auto' đang thu gọn.
          aria-label={collapsed === false ? 'Thu gọn thanh điều hướng' : 'Mở rộng thanh điều hướng'}
        >
          <PanelLeftOpen className={`size-5 ${showWhenCollapsed}`} aria-hidden="true" />
          <span className={`flex items-center gap-2 ${hideWhenCollapsed}`} aria-hidden="true">
            <PanelLeftClose className="size-4" /> Thu gọn
          </span>
        </button>
      )}

      {/* Navigation Menu */}
      <nav
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-1 [scrollbar-width:thin]"
        aria-label="Điều hướng chính"
      >
        {menuGroups.map((group, groupIdx) => (
          <div key={group.groupTitle ?? groupIdx}>
            {group.groupTitle &&
              (menuGroups.length > 1 ? (
                <h3
                  className={`px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8999b4] ${hideWhenCollapsed}`}
                >
                  {group.groupTitle}
                </h3>
              ) : (
                <h3 className="sr-only">{group.groupTitle}</h3>
              ))}
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
                      title={collapsed === false ? undefined : item.title}
                      className={`flex h-11 items-center gap-3 rounded-[10px] px-4 text-[14px] transition-colors duration-150 ${centerWhenCollapsed} ${
                        isActive
                          ? 'bg-[#b91830] font-semibold text-white shadow-sm'
                          : 'font-medium text-[#e2e7f0] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <IconComponent className="size-5 shrink-0" />
                      <span className={`flex-1 truncate ${hideWhenCollapsed}`}>{item.title}</span>
                      {item.badge && (
                        <span
                          className={`rounded px-1.5 py-px font-mono text-[9px] font-bold uppercase ${hideWhenCollapsed} ${
                            isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80'
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

      <div className={`shrink-0 ${hideWhenCollapsed}`}>
        <SidebarCampusArtwork />
        <div className="mx-3 mb-3 rounded-xl border border-white/10 bg-white/10 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Kiến trúc dữ liệu</span>
            <span className="rounded bg-[#b91830] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              Lakehouse
            </span>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-[#d5dceb]">
            Bronze (thô) → Silver (chuẩn hoá) → Gold (tích hợp)
          </p>
        </div>
      </div>
    </aside>
  )
}
