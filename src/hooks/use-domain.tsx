'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import {
  DEFAULT_DOMAIN,
  DOMAINS,
  DOMAIN_STORAGE_KEY,
  getDomain,
  isDomainCode,
} from '@/config/domains'
import type { DomainCode, DomainDefinition } from '@/config/domains'
import { getDepartmentDomain } from '@/config/roles'
import type { RoleCode } from '@/types/auth'

interface DomainContextValue {
  domain: DomainDefinition
  availableDomains: DomainDefinition[]
  setDomain: (code: DomainCode) => void
}

const DomainContext = createContext<DomainContextValue | null>(null)

function readStoredDomain(): DomainCode | null {
  try {
    const stored = window.sessionStorage.getItem(DOMAIN_STORAGE_KEY)
    return isDomainCode(stored) ? stored : null
  } catch {
    return null
  }
}

/** Giữ phân hệ đang chọn ở mức giao diện; chưa lọc dữ liệu phía backend. */
export function DomainProvider({ children, role }: { children: ReactNode; role?: RoleCode }) {
  const fixedDomain = role ? getDepartmentDomain(role) : null
  const [code, setCode] = useState<DomainCode>(fixedDomain ?? DEFAULT_DOMAIN)

  useEffect(() => {
    if (fixedDomain) {
      setCode(fixedDomain)
      return
    }
    const stored = readStoredDomain()
    if (stored) setCode(stored)
  }, [fixedDomain])

  const setDomain = useCallback(
    (next: DomainCode) => {
      if (fixedDomain && next !== fixedDomain) return
      setCode(next)
      try {
        window.sessionStorage.setItem(DOMAIN_STORAGE_KEY, next)
      } catch {
        // Trình duyệt chặn storage thì vẫn đổi được phân hệ trong phiên hiện tại.
      }
    },
    [fixedDomain]
  )

  const value = useMemo(
    () => ({
      domain: getDomain(fixedDomain ?? code),
      availableDomains: fixedDomain ? [getDomain(fixedDomain)] : DOMAINS,
      setDomain,
    }),
    [code, fixedDomain, setDomain]
  )

  return <DomainContext.Provider value={value}>{children}</DomainContext.Provider>
}

export function useDomain(): DomainContextValue {
  const context = useContext(DomainContext)
  if (!context) {
    throw new Error('useDomain phải được dùng bên trong DomainProvider')
  }
  return context
}
