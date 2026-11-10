import { http } from '@/api/http'
import type { components, paths } from '@/api/schema'

type Schemas = components['schemas']
type RecordFilters = paths['/api/v1/quarantine-records']['get']['parameters']['query']
type SummaryFilters = paths['/api/v1/quarantine-records/summary']['get']['parameters']['query']

export async function API_ListQuarantineRecords(
  params?: RecordFilters
): Promise<Schemas['QuarantineRecordRead'][]> {
  const res = await http.get<Schemas['QuarantineRecordRead'][]>('/quarantine-records', { params })
  return res.data
}

export async function API_GetQuarantineSummary(
  params?: SummaryFilters
): Promise<Schemas['QuarantineSummary']> {
  const res = await http.get<Schemas['QuarantineSummary']>('/quarantine-records/summary', {
    params,
  })
  return res.data
}

export async function API_GetQuarantineRecord(
  recordId: string
): Promise<Schemas['QuarantineRecordDetail']> {
  const res = await http.get<Schemas['QuarantineRecordDetail']>(
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
