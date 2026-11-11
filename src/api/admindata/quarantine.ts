import { http } from '@/api/http'
import type {
  QuarantineRecordFilters,
  QuarantineSummaryFilters,
  QuarantineRecord,
  QuarantineSummary,
  QuarantineRecordDetail,
} from '@/types/quarantine'

export async function API_ListQuarantineRecords(
  params?: QuarantineRecordFilters
): Promise<QuarantineRecord[]> {
  const res = await http.get<QuarantineRecord[]>('/quarantine-records', { params })
  return res.data
}

export async function API_GetQuarantineSummary(
  params?: QuarantineSummaryFilters
): Promise<QuarantineSummary> {
  const res = await http.get<QuarantineSummary>('/quarantine-records/summary', {
    params,
  })
  return res.data
}

export async function API_GetQuarantineRecord(recordId: string): Promise<QuarantineRecordDetail> {
  const res = await http.get<QuarantineRecordDetail>(
    `/quarantine-records/${encodeURIComponent(recordId)}`
  )
  return res.data
}

export async function API_GetQuarantineSource(recordId: string): Promise<Record<string, unknown>> {
  const res = await http.get<Record<string, unknown>>(
    `/quarantine-records/${encodeURIComponent(recordId)}/source`
  )
  return res.data
}
