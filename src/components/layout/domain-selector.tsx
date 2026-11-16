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

export function DomainSelector({ side = 'bottom' }: { side?: 'bottom' | 'right' }) {
  const { domain, availableDomains, setDomain } = useDomain()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Chọn phân hệ nghiệp vụ"
        className="flex h-10 w-full items-center gap-3 overflow-hidden rounded-[10px] px-[22px] text-left text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 data-[state=open]:bg-white/10"
      >
        <Landmark className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 items-center gap-2 [display:var(--sidebar-label-display,flex)]">
          <span className="min-w-0 flex-1 truncate">{domain.shortLabel}</span>
          <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side={side}
        sideOffset={12}
        className="w-72 max-w-[calc(100vw-1.5rem)]"
      >
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
