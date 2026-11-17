import { http } from '@/api/http'

export interface IngestionFlowStep {
  key: string
  label: string
  state: 'done' | 'running' | 'waiting' | 'pending' | 'failed' | 'blocked'
  detail: string
  at: string | null
}

export interface IngestionFlow {
  ingestion_job_id: number
  dataset_id: number
  dataset_name: string
  domain: string
  filename: string | null
  uploaded_by: string | null
  created_at: string | null
  ingestion_status: string
  bronze_rows: number | null
  auto_job_id: string | null
  silver_status: string | null
  error_code: string | null
  run_id: string | null
  snapshot_id: string | null
  records_read: number | null
  records_passed: number | null
  records_quarantined: number | null
  records_published: number | null
  steps: IngestionFlowStep[]
}

export async function API_ListIngestionFlows(params: {
  search?: string
  limit: number
  offset: number
}) {
  const response = await http.get<{ items: IngestionFlow[]; next_offset: number | null }>(
    '/pipeline/auto/flows',
    { params }
  )
  if (!Array.isArray(response.data?.items)) {
    throw new Error('Phản hồi luồng nạp không hợp lệ.')
  }
  return response.data
}
