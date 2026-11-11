'use client'

import { useCallback, useMemo } from 'react'

import { useRouter } from 'next/navigation'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { API_ClearAuthCookies, API_GetCurrentUser, API_Logout } from '@/api/auth/client'
import { ROLE_PRIORITY } from '@/config/roles'
import { clearStoredSession, readRefreshToken } from '@/lib/session'
import type { RoleCode } from '@/types/roles'

async function logoutApi(): Promise<void> {
  // Báo backend thu hồi refresh token; lỗi mạng không được chặn người dùng đăng xuất.
  const refreshToken = readRefreshToken()
  if (refreshToken) {
    await API_Logout(refreshToken).catch(() => undefined)
  }
  await API_ClearAuthCookies().catch(() => undefined)
}

export function useAuth() {
  const queryClient = useQueryClient()
  const router = useRouter()

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: API_GetCurrentUser,
    staleTime: 60_000,
    retry: false,
  })

  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      clearStoredSession()
      queryClient.setQueryData(['auth', 'me'], null)
      void queryClient.invalidateQueries()
      router.push('/login')
      router.refresh()
    },
  })

  const roles = useMemo(() => user?.roles ?? [], [user?.roles])

  const hasRole = useCallback((role: RoleCode) => roles.includes(role), [roles])

  const hasAnyRole = useCallback(
    (requiredRoles: RoleCode[]) => requiredRoles.some((r) => roles.includes(r)),
    [roles]
  )

  const isSuperAdmin = roles.includes('ADMIN')

  const primaryRole: RoleCode = ROLE_PRIORITY.find((role) => roles.includes(role)) ?? 'VIEWER'

  return {
    user: user ?? null,
    roles,
    primaryRole,
    isAuthenticated: Boolean(user),
    isLoading,
    isError,
    isSuperAdmin,
    hasRole,
    hasAnyRole,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  }
}
