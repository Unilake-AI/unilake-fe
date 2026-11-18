'use client'

import { useId, useRef, useState } from 'react'
import type { ComponentType } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  CircleUser,
  ClipboardCheck,
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
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
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
} from 'lucide-react'

import { ROLE_MENUS } from '@/config/menu'
import { getDepartmentDomain, getWorkspaceForRole } from '@/config/roles'
import type { SidebarProps } from '@/types/layout/sidebar'

import { DomainSelector } from './domain-selector'
import styles from './sidebar.module.css'

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  LayoutGrid,
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
  ClipboardCheck,
  CircleUser,
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

export function Sidebar({ role, onCloseMobile }: SidebarProps) {
  const [expanded, setExpanded] = useState(false)
  const navigationId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const toggleLabel = expanded ? 'Thu gọn thanh điều hướng' : 'Mở rộng thanh điều hướng'
  const ToggleIcon = expanded ? PanelLeftClose : PanelLeftOpen
  const pathname = usePathname()
  const menuGroups = ROLE_MENUS[getWorkspaceForRole(role)]
  // Mục đang mở là mục có đường dẫn dài nhất khớp với URL (vd. /data/sources/new → Nguồn dữ liệu).
  const activeHref = menuGroups
    .flatMap((group) => group.items.map((item) => item.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0]

  return (
    <aside
      data-expanded={expanded || Boolean(onCloseMobile)}
      data-mobile={Boolean(onCloseMobile)}
      className={`${styles.sidebar} flex h-full flex-col bg-sidebar text-slate-200`}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && expanded && !onCloseMobile && !event.defaultPrevented) {
          setExpanded(false)
          toggleRef.current?.focus()
        }
      }}
    >
      {!onCloseMobile && (
        <div className="shrink-0 border-b border-white/10 p-2">
          <button
            ref={toggleRef}
            type="button"
            aria-controls={navigationId}
            aria-expanded={expanded}
            aria-label={toggleLabel}
            title={toggleLabel}
            onClick={() => setExpanded((current) => !current)}
            className="grid h-10 w-12 place-items-center rounded-md hover:bg-white/10 focus-visible:-outline-offset-2"
          >
            <ToggleIcon className="size-5 shrink-0" aria-hidden="true" />
          </button>
        </div>
      )}

      {!getDepartmentDomain(role) && role !== 'DATA_ADMIN' && (
        <div className="px-2 pb-1">
          <DomainSelector side={onCloseMobile ? 'bottom' : 'right'} />
        </div>
      )}

      <nav
        id={navigationId}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-2 [scrollbar-width:thin]"
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
                      onNavigate={onCloseMobile ?? (() => setExpanded(false))}
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={item.title}
                      title={!onCloseMobile ? item.title : undefined}
                      className={`flex min-h-11 items-center gap-3 overflow-hidden rounded-lg px-3.5 py-2 text-sm transition-colors duration-150 focus-visible:-outline-offset-2 ${
                        isActive
                          ? 'bg-primary font-semibold text-white shadow-sm'
                          : 'font-medium text-[#e2e7f0] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <IconComponent className="size-5 shrink-0" aria-hidden="true" />
                      <span aria-hidden="true" className={`${styles.details} leading-snug`}>
                        {item.title}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
