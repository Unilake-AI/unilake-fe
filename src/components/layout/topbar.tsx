'use client'

import Link from 'next/link'

import { Bell, Building2, ChevronDown, Layers, Menu, Sparkles } from 'lucide-react'

import { ASK_AI_PATHS } from '@/config/menu'
import type { RoleCode } from '@/types/auth'

import { DomainSelector } from './domain-selector'
import { UserMenu } from './user-menu'

interface TopbarProps {
  role: RoleCode
  onOpenMobile?: () => void
}

export function Topbar({ role, onOpenMobile }: TopbarProps) {
  const askAiPath = ASK_AI_PATHS[role]

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:gap-3 md:px-4">
      <button
        type="button"
        onClick={onOpenMobile}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
        aria-label="Mở menu điều hướng"
      >
        <Menu className="size-4" />
      </button>

      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Layers className="size-[18px]" />
        </div>
        <div className="hidden flex-col sm:flex">
          <span className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-900">UniLake AI</span>
            <span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-px font-mono text-[10px] font-bold text-indigo-700">
              v1.0
            </span>
          </span>
          <span className="font-mono text-[9px] font-medium uppercase tracking-wider text-slate-400">
            Hồ dữ liệu & phân tích AI
          </span>
        </div>
      </div>

      <div className="hidden h-6 w-px shrink-0 bg-slate-200 sm:block" />

      <DomainSelector />

      <div className="hidden h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 xl:flex">
        <Building2 className="size-3.5 text-slate-500" />
        Toàn trường (Tất cả đơn vị)
        <ChevronDown className="size-3.5 text-slate-400" />
      </div>

      <div className="flex-1" />

      {askAiPath && (
        <Link
          href={askAiPath}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
        >
          <Sparkles className="size-3.5" />
          <span className="hidden sm:inline">Ask AI (NLQ)</span>
          <span className="sm:hidden">AI</span>
        </Link>
      )}

      <button
        type="button"
        className="relative hidden size-8 shrink-0 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 sm:flex"
        aria-label="Thông báo hệ thống"
      >
        <Bell className="size-4" />
      </button>

      <UserMenu role={role} />
    </header>
  )
}
