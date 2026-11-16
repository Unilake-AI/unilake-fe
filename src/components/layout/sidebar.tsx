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
  UserPlus,
  Users,
  Workflow,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

import { ROLE_MENUS } from '@/config/menu'
import { ROLE_DEFINITIONS, getDepartmentDomain, getWorkspaceForRole } from '@/config/roles'
import type { SidebarProps } from '@/types/layout/sidebar'

import { DomainSelector } from './domain-selector'
import styles from './sidebar.module.css'
import logo from '../../../public/logo.png'
import logoText from '../../../public/logo_text.png'

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
  Workflow,
}

export function Sidebar({
  role,
  actions,
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

  return (
    <aside
      data-collapsed={collapsed}
      className={`${styles.sidebar} flex h-full max-w-[86vw] flex-col overflow-hidden bg-[#101b32] text-[#aeb9cd] motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-in-out`}
    >
      <div
        className={`${styles.brand} relative flex shrink-0 items-center border-b border-white/10`}
      >
        <span className="sr-only">UniLake AI</span>
        <Image
          src={logo}
          alt=""
          width={36}
          height={36}
          className={`${styles.compactMark} pointer-events-none absolute left-1/2 top-2 size-9 -translate-x-1/2 object-contain`}
        />
        <Image
          src={logoText}
          alt=""
          width={192}
          height={64}
          className={`${styles.details} pointer-events-none absolute left-3 h-auto w-48 max-w-none`}
        />
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-controls="workspace-navigation"
            className={`${styles.toggle} absolute grid size-8 place-items-center rounded-md border border-white/20 text-white transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2`}
          >
            <PanelLeftOpen className={`${styles.compactMark} absolute size-4`} aria-hidden="true" />
            <PanelLeftClose className={`${styles.details} size-4`} aria-hidden="true" />
            <span className={`${styles.expandedLabel} sr-only`}>Thu gọn thanh điều hướng</span>
            <span className={`${styles.compactLabel} sr-only`}>Mở rộng thanh điều hướng</span>
          </button>
        )}
      </div>

      <div className={styles.section}>
        <div className="overflow-hidden">
          <div className="px-6 pb-3 pt-4">
            <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[.13em] text-[#a8b1c5]">
              Phân hệ vai trò (RBAC)
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{roleDef.name}</p>
          </div>
        </div>
      </div>

      {!getDepartmentDomain(role) && role !== 'DATA_ADMIN' && (
        <div className="px-2 pb-1">
          <DomainSelector side={onCloseMobile ? 'bottom' : 'right'} />
        </div>
      )}

      <nav
        id={onToggleCollapsed ? 'workspace-navigation' : undefined}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-2 [scrollbar-width:none]"
        aria-label="Điều hướng chính"
      >
        {menuGroups.map((group, groupIdx) => (
          <div key={group.groupTitle ?? groupIdx}>
            {group.groupTitle &&
              (menuGroups.length > 1 ? (
                <div className={styles.section}>
                  <div className="overflow-hidden">
                    <h3 className="truncate px-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8999b4]">
                      {group.groupTitle}
                    </h3>
                  </div>
                </div>
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
                      aria-label={item.title}
                      title={onToggleCollapsed ? item.title : undefined}
                      className={`flex h-11 items-center gap-3 overflow-hidden rounded-[10px] px-5 text-[14px] transition-colors duration-150 ${
                        isActive
                          ? 'bg-[#b91830] font-semibold text-white shadow-sm'
                          : 'font-medium text-[#e2e7f0] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <IconComponent className="size-5 shrink-0" />
                      <span
                        className={`${styles.details} line-clamp-2 min-w-0 flex-1 leading-snug`}
                      >
                        {item.title}
                      </span>
                      {item.badge && (
                        <span
                          className={`${styles.details} rounded px-1.5 py-px font-mono text-[9px] font-bold uppercase ${
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
        {actions && <div className="space-y-1 border-t border-white/10 pt-2">{actions}</div>}
      </nav>
    </aside>
  )
}
