import { http } from '@/api/http'

export type GoldStatus = 'QUEUED' | 'RUNNING' | 'RETRY_WAIT' | 'SUCCEEDED' | 'FAILED' | 'SUPERSEDED'
export type DatabaseSyncStatus =
  'QUEUED' | 'RUNNING' | 'SYNCED' | 'BLOCKED' | 'FAILED' | 'SUPERSEDED'
export interface DatabaseSync {
  database_sync_status: DatabaseSyncStatus | null
  database_sync_error: string | null
  database_sync_report?: { code: string; entity?: string; field?: string | null } | null
  database_sync_result?: {
    entities: Record<string, number>
    records_synced: number
    source: string
    recipe_version: string
  } | null
}
export type GoldDomain = 'hr' | 'academic' | 'admissions'
export interface GoldSource extends DatabaseSync {
  scope: string
  silver_snapshot_id: string
  dataset_id: number
  dataset_name: string
  domain: GoldDomain
  job_id: string | null
  status: GoldStatus | null
  sync_status: GoldStatus | 'CURRENT' | 'NOT_STARTED'
  error_code: string | null
}
export interface GoldJob extends DatabaseSync {
  job_id: string
  dataset_id: number
  domain: GoldDomain
  scope: string
  silver_snapshot_id: string
  recipe_version: string
  generation: number
  status: GoldStatus
  attempt_number: number
  error_code: string | null
  created_at: string
  finished_at: string | null
  result?: {
    records_read: number
    aggregate_rows: number
    object: { key: string }
    lineage: unknown
  } | null
}
export interface GoldMetric {
  dataset_name: string
  dataset_id: number
  domain: GoldDomain
  scope: string
  gold_snapshot_id: string
  silver_snapshot_id: string
  entity: string
  metric: string
  dimensions: Record<string, string | number | boolean | null>
  value: number
}
export interface GoldWorker {
  worker_id: string
  heartbeat_at: string
  healthy: boolean
}
export interface GoldAttempt {
  attempt_number: number
  status: GoldStatus
  error_code: string | null
  started_at: string
  finished_at: string | null
}
export const API_GoldSources = async (params: {
  domain?: GoldDomain
  limit?: number
  offset?: number
}) => (await http.get<GoldSource[]>('/pipeline/gold/sources', { params })).data
export const API_GoldJobs = async (params: {
  domain?: GoldDomain
  limit?: number
  offset?: number
}) => (await http.get<GoldJob[]>('/pipeline/gold/jobs', { params })).data
export const API_GoldMetrics = async (params: {
  domain?: GoldDomain
  dataset_id?: number
  limit?: number
  offset?: number
}) => (await http.get<GoldMetric[]>('/pipeline/gold/metrics', { params })).data
export const API_GoldJob = async (id: string) =>
  (await http.get<GoldJob>(`/pipeline/gold/jobs/${encodeURIComponent(id)}`)).data
export const API_GoldAttempts = async (id: string) =>
  (await http.get<GoldAttempt[]>(`/pipeline/gold/jobs/${encodeURIComponent(id)}/attempts`)).data
export const API_GoldWorkers = async () =>
  (await http.get<GoldWorker[]>('/pipeline/gold/workers')).data
export const API_GoldRecipes = async () =>
  (await http.get<{ version: string; note: string }>('/pipeline/gold/recipes')).data
export const API_RefreshGold = async (silverSnapshot: string) =>
  (
    await http.post<{ job_id: string; status: GoldStatus }>('/pipeline/gold/refresh', {
      silver_snapshot_id: silverSnapshot,
    })
  ).data
export const API_RetryGold = async (id: string) =>
  (await http.post(`/pipeline/gold/jobs/${encodeURIComponent(id)}/retry`)).data as {
    job_id: string
    status: GoldStatus
  }
export const API_GoldReport = async (id: string) =>
  (
    await http.get<Blob>(`/pipeline/gold/jobs/${encodeURIComponent(id)}/report`, {
      responseType: 'blob',
    })
  ).data

export const API_RetryGoldDatabaseSync = async (id: string) =>
  (await http.post(`/pipeline/gold/jobs/${encodeURIComponent(id)}/database-sync/retry`)).data as {
    job_id: string
    status: DatabaseSyncStatus
  }
