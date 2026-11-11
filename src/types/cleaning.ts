import type { components, paths } from '@/api/schema'

export type CleaningRun = components['schemas']['CleaningRunRead']

export type CleaningRunFilters = paths['/api/v1/cleaning-runs']['get']['parameters']['query']

export type ManualCleaningResponse = components['schemas']['ManualCleaningResponse']

export interface CleaningPreviewResponse {
  preview: boolean
  ingestion_job_id: number
  profile_id: string
  profile_fingerprint: string
  records_read: number
  records_passed_cleaning: number
  records_quarantined: number
  records_collapsed: number
  records_normalized: number
  cleaning_issues: Array<Record<string, unknown>>
  normalization_issues: Array<Record<string, unknown>>
  cleaned_sample: Array<Record<string, unknown>>
  normalized_sample: Array<Record<string, unknown>>
  publication_checked: boolean
  note?: string
}
