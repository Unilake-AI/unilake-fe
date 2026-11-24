import { http } from '@/api/http'

export type DomainStatus = 'NO_DATA' | 'PENDING' | 'PARTIAL' | 'READY'

export interface ViewerContext {
  user_id: number
  username?: string
  full_name?: string
  roles: string[]
  domains: { domain: string; name: string }[]
}

export interface DomainOverviewInfo {
  status: DomainStatus
  datasets?: number
  sources?: number
  last_updated_at?: string | null
}

export interface ViewerOverview {
  datasets: number
  sources: number
  ready_domains: number
  domains: Record<string, DomainOverviewInfo>
}

export interface HighlightMetric {
  dataset_id: number
  scope: string
  entity: string
  value: number
  unit: string // 'records'
}

export interface ViewerDomainOverview {
  domain: string
  status: DomainStatus
  last_updated_at: string | null
  highlight_metric?: HighlightMetric | null
  message?: string | null
}

export interface ViewerPage<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface ViewerAnalyticsFilters {
  dataset_id?: number
  entity?: string
  metric?: string
  dimension_value?: string
  limit?: number
  offset?: number
}

export interface ViewerMetricItem {
  dataset_id: number
  dataset_name: string
  domain: string
  scope: string
  entity: string
  metric: string
  dimensions: Record<string, unknown>
  value: number
  unit?: string
  finished_at?: string
}

export interface ViewerDatasetFilters {
  domain?: string
  dataset_id?: number
  limit?: number
  offset?: number
}

export interface ViewerDatasetMetadata {
  dataset_id: number
  name: string
  domain: string
  department_name?: string | null
  department_id?: number | null
  description?: string | null
  status: string
  created_at?: string
  updated_at?: string
}

export interface ViewerColumn {
  name: string
  type: string
  nullable?: boolean
  description?: string | null
}

export interface ViewerTable {
  table_name: string
  columns: ViewerColumn[]
}

export interface ViewerDatasetDetail extends ViewerDatasetMetadata {
  tables?: ViewerTable[]
}

export interface ViewerQualityOverview {
  quality: {
    total: number
    assigned: number
    pending_verification: number
    verified: number
  }
  publication: {
    total_sources?: number
    gold_ready?: number
    datasets_without_scope: number
    gold_job_failed: number
    sync_failed: number
  }
  freshness: Record<string, string | null>
}

export interface ViewerIssueFilters {
  domain?: string
  status?: 'ASSIGNED' | 'PENDING_VERIFICATION' | 'VERIFIED' | string
  dataset_id?: number
  limit?: number
  offset?: number
}

export interface ViewerIssueItem {
  issue_id: string
  dataset_id: number
  dataset_name?: string
  department_id?: number
  department_name?: string
  domain: string
  title: string
  description?: string
  status: 'ASSIGNED' | 'PENDING_VERIFICATION' | 'VERIFIED'
  created_at: string
  updated_at: string
}

// API Viewer Clients

export const API_ViewerContext = async () =>
  (await http.get<ViewerContext>('/viewer/context')).data

export const API_ViewerOverview = async () =>
  (await http.get<ViewerOverview>('/viewer/overview')).data

export const API_ViewerDomainOverview = async (domain: string) =>
  (await http.get<ViewerDomainOverview>(`/viewer/domains/${encodeURIComponent(domain)}/overview`)).data

export const API_ViewerDomainAnalytics = async (domain: string, params?: ViewerAnalyticsFilters) =>
  (await http.get<ViewerPage<ViewerMetricItem>>(`/viewer/domains/${encodeURIComponent(domain)}/analytics`, { params })).data

export const API_ViewerDatasets = async (params?: ViewerDatasetFilters) =>
  (await http.get<ViewerPage<ViewerDatasetMetadata>>('/viewer/datasets', { params })).data

export const API_ViewerDatasetDetail = async (datasetId: number) =>
  (await http.get<ViewerDatasetDetail>(`/viewer/datasets/${datasetId}`)).data

export const API_ViewerQualityOverview = async () =>
  (await http.get<ViewerQualityOverview>('/viewer/quality/overview')).data

export const API_ViewerQualityIssues = async (params?: ViewerIssueFilters) =>
  (await http.get<ViewerPage<ViewerIssueItem>>('/viewer/quality/issues', { params })).data
