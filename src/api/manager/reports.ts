import { http } from '@/api/http'
import type { components, paths } from '@/api/schema'

export type ManagerContext = components['schemas']['ManagerContext']
export type ManagerMetric = components['schemas']['GoldMetric']
export type ManagerOverview = components['schemas']['ManagerOverview']
export type ReportFilters = paths['/api/v1/manager/overview']['get']['parameters']['query']
export type AnalyticsFilters = paths['/api/v1/manager/analytics']['get']['parameters']['query'] & {
  dimension_value?: string
}
export type IssueFilters = paths['/api/v1/manager/issues']['get']['parameters']['query']

export interface AnalysisMetricOption {
  metric: string
  name?: string
}

export interface AnalysisEntityOption {
  domain?: string
  entity: string
  metrics: AnalysisMetricOption[]
}

type AnalysisOptionRow = { entity: string; metric: string }

export const API_ManagerContext = async () =>
  (await http.get<ManagerContext>('/manager/context')).data
export const API_ManagerOverview = async (params: ReportFilters) =>
  (await http.get<ManagerOverview>('/manager/overview', { params })).data
export const API_ManagerAnalytics = async (params: AnalyticsFilters) =>
  (await http.get<components['schemas']['MetricPage']>('/manager/analytics', { params })).data
export const API_ManagerAnalysisOptions = async (domain?: string) => {
  const { data } = await http.get<(AnalysisEntityOption | AnalysisOptionRow)[]>(
    '/manager/analysis-options',
    { params: domain ? { domain } : undefined }
  )
  const options = new Map<string, AnalysisEntityOption>()

  for (const row of data) {
    const rowDomain = 'domain' in row ? (row.domain ?? domain) : domain
    const metrics = 'metric' in row ? [{ metric: row.metric }] : row.metrics
    if (!Array.isArray(metrics)) continue

    const key = JSON.stringify([rowDomain, row.entity])
    const option = options.get(key)
    if (option) {
      option.metrics.push(...metrics)
    } else {
      options.set(key, { domain: rowDomain, entity: row.entity, metrics: [...metrics] })
    }
  }

  return [...options.values()]
}
export const API_ManagerIssues = async (params: IssueFilters) =>
  (await http.get<components['schemas']['IssueRead'][]>('/manager/issues', { params })).data
export const API_ManagerIssueStats = async (params: IssueFilters) =>
  (await http.get<components['schemas']['IssueStats']>('/manager/issues/stats', { params })).data
export const API_ManagerIssue = async (id: string) =>
  (
    await http.get<components['schemas']['IssueDetail']>(
      `/manager/issues/${encodeURIComponent(id)}`
    )
  ).data
