import { http } from '@/api/http'
import type { CleaningPreviewResponse } from '@/types/cleaning'
import type { SilverProfileRead } from '@/types/silver-profiles'

export type DateOrder = 'YMD' | 'DMY' | 'MDY'
export type FieldKind = 'string' | 'integer' | 'decimal' | 'date' | 'timestamp' | 'boolean'

export interface SetupField {
  name: string
  label: string
  kind: string
  nullable: boolean
  identifier: boolean
  suggested_source: string | null
  date_formats: DateOrder[]
  allowed_values: string[]
  reference_entity?: string | null
}

export interface SetupEntity {
  custom?: boolean
  entity: string
  label: string
  fields: SetupField[]
  field_mapping: Record<string, string>
  matched_columns: number
  total_columns: number
}

export interface CleaningSetupAnalysis {
  ingestion_job_id: number
  dataset_id: number
  source_table: string
  records_read: number
  analysis_fingerprint: string
  columns: { name: string; empty_count: number; leading_zero_count: number }[]
  entities: SetupEntity[]
  suggested_entity: string | null
  crosswalk_releases: string[]
  reference_sources: { namespace: string; label: string }[]
  notes: string[]
}

export interface CleaningChoices {
  identity_mode: 'source' | 'canonical'
  field_types: Record<string, FieldKind>
  identifier_fields: string[]
  required_fields: string[]
  primary_key: string[]
  analysis_fingerprint: string
  entity: string
  field_mapping: Record<string, string>
  ignored_columns: string[]
  date_formats: Record<string, DateOrder>
  null_tokens: string[]
  trim_text: boolean
  collapse_exact_duplicates: boolean
  crosswalk_release: string | null
  reference_namespaces: Record<string, string>
}

export interface SetupPreview extends CleaningPreviewResponse {
  confirmation_token: string | null
  blocking_reasons: string[]
}

const path = (jobId: number) => `/pipeline/cleaning/ingestion-jobs/${jobId}/setup`

export async function API_GetCleaningSetup(jobId: number): Promise<CleaningSetupAnalysis> {
  const response = await http.get<CleaningSetupAnalysis>(path(jobId))
  return response.data
}

export async function API_PreviewCleaningSetup(
  jobId: number,
  choices: CleaningChoices
): Promise<SetupPreview> {
  const response = await http.post<SetupPreview>(`${path(jobId)}/preview`, choices)
  return response.data
}

export async function API_ConfirmCleaningSetup(
  jobId: number,
  choices: CleaningChoices,
  confirmationToken: string
): Promise<SilverProfileRead> {
  const response = await http.post<SilverProfileRead>(`${path(jobId)}/confirm`, {
    choices,
    confirmation_token: confirmationToken,
  })
  return response.data
}
