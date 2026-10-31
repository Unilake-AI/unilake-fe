import { http } from '@/api/http'
import type {
  CatalogEntry,
  DataSourceCreatePayload,
  DataSourceFilter,
  DataSourceItem,
  DataSourceListResponse,
  IngestionJob,
  IngestionJobCreatePayload,
  NlqResponse,
} from '@/types/data'

export async function API_ListDataSources(
  filter: DataSourceFilter
): Promise<DataSourceListResponse> {
  const res = await http.get<DataSourceListResponse>('/datasources', { params: filter })
  return res.data
}

export async function API_GetDataSource(id: number): Promise<DataSourceItem> {
  const res = await http.get<DataSourceItem>(`/datasources/${id}`)
  return res.data
}

export async function API_CreateDataSource(
  payload: DataSourceCreatePayload
): Promise<DataSourceItem> {
  const res = await http.post<DataSourceItem>('/datasources/create', payload)
  return res.data
}

export async function API_UpdateDataSource(
  id: number,
  payload: Partial<DataSourceCreatePayload>
): Promise<DataSourceItem> {
  const res = await http.patch<DataSourceItem>(`/datasources/${id}`, payload)
  return res.data
}

export async function API_ListIngestionJobs(params: {
  data_source_id?: number
  limit?: number
  offset?: number
}): Promise<IngestionJob[]> {
  const res = await http.get<IngestionJob[]>('/ingestion/jobs', { params })
  return res.data
}

export async function API_CreateIngestionJob(
  payload: IngestionJobCreatePayload
): Promise<IngestionJob> {
  const res = await http.post<IngestionJob>('/ingestion/jobs', payload)
  return res.data
}

export async function API_GetCatalog(domainId?: string): Promise<CatalogEntry[]> {
  const res = await http.get<CatalogEntry[]>('/governance/catalog', {
    params: domainId ? { domain_id: domainId } : undefined,
  })
  return res.data
}

export async function API_AskNlq(question: string): Promise<NlqResponse> {
  const res = await http.post<NlqResponse>('/nlq/ask', { question })
  return res.data
}
