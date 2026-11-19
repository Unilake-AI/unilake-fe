import { http } from '@/api/http'

export interface ManagerHistoryItem {
  id: string
  question: string
  status: string
  domain?: string | null
  duration_ms?: number | null
  row_count?: number | null
  created_at: string
  error_code?: string | null
}

export interface ManagerHistoryPage {
  items: ManagerHistoryItem[]
  total: number
  limit: number
  offset: number
}

export interface ManagerHistoryDetail extends ManagerHistoryItem {
  sql?: string | null
  answer?: string | null
  rows?: Record<string, unknown>[]
}

export interface ManagerHistoryFilters {
  domain?: string
  limit?: number
  offset?: number
}

export async function API_ManagerHistory(
  params: ManagerHistoryFilters = {}
): Promise<ManagerHistoryPage> {
  const limit = params.limit ?? 20
  const offset = params.offset ?? 0
  const res = await http.get<ManagerHistoryPage | ManagerHistoryItem[]>('/manager/history', {
    params: {
      domain: params.domain || undefined,
      limit,
      offset,
    },
  })
  if (Array.isArray(res.data)) {
    return { items: res.data, total: res.data.length, limit, offset }
  }
  return res.data
}

export async function API_ManagerHistoryDetail(queryId: string): Promise<ManagerHistoryDetail> {
  const res = await http.get<ManagerHistoryDetail>(
    `/manager/history/${encodeURIComponent(queryId)}`
  )
  return res.data
}
