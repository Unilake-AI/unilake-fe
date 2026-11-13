'use client'

import Image from 'next/image'
import Link from 'next/link'

import { Bell, Building2, ChevronDown, Menu, Sparkles } from 'lucide-react'

import campusImage from '@/assets/login/duy-tan-campus-source.png'
import { ASK_AI_PATHS } from '@/config/menu'
import { getWorkspaceForRole } from '@/config/roles'
import type { TopbarProps } from '@/types/layout/topbar'

import { DomainSelector } from './domain-selector'
import { UserMenu } from './user-menu'

export function Topbar({ role, onOpenMobile }: TopbarProps) {
  const askAiPath = ASK_AI_PATHS[getWorkspaceForRole(role)]

  return (
    <header className="sticky top-0 z-30 flex min-h-[68px] shrink-0 items-center gap-2 border-b border-[#e2e6ef] bg-white px-3 shadow-[0_2px_12px_rgba(16,27,50,.05)] sm:gap-3 md:px-5">
      <div
        className="pointer-events-none absolute inset-y-0 left-1/2 right-1/4 hidden overflow-hidden lg:block"
        aria-hidden="true"
      >
        <Image
          src={campusImage}
          alt=""
          fill
          sizes="500px"
          className="object-cover object-[center_40%] opacity-[.13] [mask-image:linear-gradient(to_right,transparent,black_35%,transparent)]"
        />
      </div>
      <button
        type="button"
        onClick={onOpenMobile}
        className="relative flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#cbd4e3] text-[#17233d] transition-colors hover:bg-slate-100 md:hidden"
        aria-label="Mở menu điều hướng"
      >
        <Menu className="size-4" />
      </button>

      <div className="relative flex shrink-0 items-center gap-1.5 md:hidden">
        <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-slate-50 sm:hidden">
          <Image
            src="/logo.png"
            alt="UniLake AI"
            width={68}
            height={68}
            className="max-w-none shrink-0"
          />
        </div>
        <div className="hidden h-10 w-36 items-center overflow-hidden sm:flex">
          <Image
            src="/logo_text.png"
            alt="UniLake AI"
            width={1672}
            height={941}
            sizes="144px"
            className="h-auto w-full"
          />
        </div>
        <span className="hidden rounded border border-indigo-200 bg-indigo-50 px-1.5 py-px font-mono text-[10px] font-bold text-indigo-700 sm:inline">
          v1.0
        </span>
      </div>

      <DomainSelector />

      <div
        role="note"
        aria-label="Phạm vi đơn vị: Toàn trường (Tất cả đơn vị)"
        title="Chưa có dữ liệu đơn vị để thay đổi phạm vi"
        className="relative hidden h-10 shrink-0 items-center gap-2 rounded-[9px] border border-[#cbd4e3] bg-white px-3 text-[13px] font-semibold text-[#17233d] shadow-sm xl:flex"
      >
        <Building2 className="size-4 text-[#34486c]" />
        Toàn trường (Tất cả đơn vị)
        <ChevronDown className="size-4 text-[#34486c]" />
      </div>

      <div className="flex-1" />

      {askAiPath && (
        <Link
          href={askAiPath}
          className="relative hidden h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#e4bec6] bg-[#fff7f8] px-3 text-xs font-semibold text-[#b91830] transition-colors hover:bg-[#fbe9ed] sm:flex"
        >
          <Sparkles className="size-3.5" />
          <span className="hidden sm:inline">Ask AI (NLQ)</span>
          <span className="sm:hidden">AI</span>
        </Link>
      )}

      <span
        role="img"
        title="Thông báo chưa được kết nối trong phiên bản hiện tại"
        className="relative flex size-10 shrink-0 items-center justify-center text-[#34486c]"
        aria-label="Thông báo chưa khả dụng"
      >
        <Bell className="size-5" />
      </span>

      <UserMenu role={role} />
    </header>
  )
}
