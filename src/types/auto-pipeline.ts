export type AutoSilverStatus =
  'QUEUED' | 'RUNNING' | 'RETRY_WAIT' | 'SUCCESS' | 'QUARANTINED' | 'FAILED' | 'CANCELLED'

export interface AutoSilverPolicyRequest {
  expected_revision: number
  enabled: boolean
  profile_id: string
  allow_partial_publication: boolean
  max_attempts: number
  retry_delay_seconds: number
}

export interface AutoSilverPolicy {
  dataset_id: number
  revision: number
  enabled: boolean
  definition: Omit<AutoSilverPolicyRequest, 'expected_revision' | 'enabled'>
  updated_by: string
  updated_at: string
}

export interface AutoSilverResult {
  status?: string
  run_id?: string
  records_read?: number
  records_passed?: number
  records_quarantined?: number
  records_collapsed?: number
  publication?: { status?: string; snapshot_id?: string; records_published?: number }
}

export interface AutoSilverJob {
  dataset_name?: string
  source_table?: string
  domain?: string
  processing_mode?: string
  job_id: string
  ingestion_job_id: number
  dataset_id: number
  status: AutoSilverStatus
  attempt_number: number
  error_code: string | null
  result: AutoSilverResult | null
  created_at: string
  finished_at: string | null
  next_attempt_at: string | null
}

export interface AutoSilverJobDetail extends AutoSilverJob {
  worker_id: string | null
  lease_expires_at: string | null
}

export interface AutoSilverAttempt {
  attempt_number: number
  worker_id: string
  status: AutoSilverStatus
  error_code: string | null
  started_at: string
  finished_at: string | null
}

export interface AutoSilverWorker {
  healthy?: boolean
  worker_id: string
  current_job_id: string | null
  last_heartbeat_at: string
}

export interface AutoSilverJobFilters {
  dataset_id?: number
  ingestion_job_id?: number
  limit?: number
  offset?: number
}
