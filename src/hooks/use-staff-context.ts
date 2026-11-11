'use client'

import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

import { API_GetStaffContext } from '@/api/staff/context'

export const STAFF_CONTEXT_QUERY_KEY = ['staff', 'context'] as const

export function useStaffContext() {
  const query = useQuery({
    queryKey: STAFF_CONTEXT_QUERY_KEY,
    queryFn: API_GetStaffContext,
    staleTime: 60_000,
    retry: (failureCount, error) => {
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 401 || error.response?.status === 403)
      ) {
        return false
      }
      return failureCount < 1
    },
  })

  return {
    ...query,
    isForbidden: axios.isAxiosError(query.error) && query.error.response?.status === 403,
  }
}
