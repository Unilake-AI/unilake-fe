'use client'

import type { ComponentType } from 'react'

import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  GraduationCap,
  Landmark,
  Layers,
  UserPlus,
} from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDomain } from '@/hooks/use-domain'
import type { DomainDefinition } from '@/types/domains'

const DOMAIN_ICONS: Record<DomainDefinition['iconName'], ComponentType<{ className?: string }>> = {
  Layers,
  UserPlus,
  GraduationCap,
  BriefcaseBusiness,
}

export function DomainSelector() {
  const { domain, availableDomains, setDomain } = useDomain()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Chọn phân hệ nghiệp vụ"
        className="relative flex h-10 min-w-0 items-center gap-2 rounded-[9px] border border-[#cbd4e3] bg-white px-3 text-[13px] font-semibold text-[#17233d] shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91830] data-[state=open]:border-[#b91830]"
      >
        <Landmark className="size-4 shrink-0 text-[#34486c]" />
        <span className="truncate">
          <span className="hidden sm:inline">Phân hệ: </span>
          {domain.shortLabel}
        </span>
        <ChevronDown className="size-4 shrink-0 text-[#34486c]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="font-mono text-[10px] font-medium uppercase tracking-wider text-slate-400">
          Chọn phân hệ nghiệp vụ
        </DropdownMenuLabel>
        {availableDomains.map((item) => {
          const Icon = DOMAIN_ICONS[item.iconName]
          const selected = item.code === domain.code
          return (
            <DropdownMenuItem
              key={item.code}
              onSelect={() => setDomain(item.code)}
              className={
                selected
                  ? 'bg-rose-50 text-[#b91830] focus:bg-rose-50 focus:text-[#b91830]'
                  : 'text-slate-700'
              }
            >
              <Icon className={selected ? 'text-[#b91830]' : 'text-slate-500'} />
              <span className="flex-1">{item.label}</span>
              {selected && <Check className="text-[#b91830]" aria-label="Đang chọn" />}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-[11px] leading-4 text-slate-500">
          Đổi phân hệ sẽ đổi dữ liệu Dashboard và ngữ cảnh Hỏi AI.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
