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
import { DOMAINS } from '@/config/domains'
import type { DomainDefinition } from '@/config/domains'
import { useDomain } from '@/hooks/use-domain'

const DOMAIN_ICONS: Record<DomainDefinition['iconName'], ComponentType<{ className?: string }>> = {
  Layers,
  UserPlus,
  GraduationCap,
  BriefcaseBusiness,
}

export function DomainSelector() {
  const { domain, setDomain } = useDomain()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Chọn phân hệ nghiệp vụ"
        className="flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 data-[state=open]:border-indigo-500 data-[state=open]:ring-1 data-[state=open]:ring-indigo-500"
      >
        <Landmark className="size-3.5 shrink-0 text-slate-500" />
        <span className="truncate">
          <span className="hidden sm:inline">Phân hệ: </span>
          {domain.shortLabel}
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-slate-400" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="font-mono text-[10px] font-medium uppercase tracking-wider text-slate-400">
          Chọn phân hệ nghiệp vụ
        </DropdownMenuLabel>
        {DOMAINS.map((item) => {
          const Icon = DOMAIN_ICONS[item.iconName]
          const selected = item.code === domain.code
          return (
            <DropdownMenuItem
              key={item.code}
              onSelect={() => setDomain(item.code)}
              className={
                selected
                  ? 'bg-indigo-50 text-indigo-700 focus:bg-indigo-50 focus:text-indigo-700'
                  : 'text-slate-700'
              }
            >
              <Icon className={selected ? 'text-indigo-600' : 'text-slate-500'} />
              <span className="flex-1">{item.label}</span>
              {selected && <Check className="text-indigo-600" aria-label="Đang chọn" />}
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
