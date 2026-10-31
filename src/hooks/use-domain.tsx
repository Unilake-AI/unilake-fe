'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { DEFAULT_DOMAIN, DOMAIN_STORAGE_KEY, getDomain, isDomainCode } from '@/config/domains'
import type { DomainCode, DomainDefinition } from '@/config/domains'

interface DomainContextValue {
  domain: DomainDefinition
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
export function DomainProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<DomainCode>(DEFAULT_DOMAIN)

  useEffect(() => {
    const stored = readStoredDomain()
    if (stored) setCode(stored)
  }, [])

  const setDomain = useCallback((next: DomainCode) => {
    setCode(next)
    try {
      window.sessionStorage.setItem(DOMAIN_STORAGE_KEY, next)
    } catch {
      // Trình duyệt chặn storage thì vẫn đổi được phân hệ trong phiên hiện tại.
    }
  }, [])

  const value = useMemo(() => ({ domain: getDomain(code), setDomain }), [code, setDomain])

  return <DomainContext.Provider value={value}>{children}</DomainContext.Provider>
}

export function useDomain(): DomainContextValue {
  const context = useContext(DomainContext)
  if (!context) {
    throw new Error('useDomain phải được dùng bên trong DomainProvider')
  }
  return context
}
