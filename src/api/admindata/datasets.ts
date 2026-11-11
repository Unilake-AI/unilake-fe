import { http } from '@/api/http'
import { API_GetDataset, API_ListDatasets } from '@/api/shared/datasets'
import type { DatasetCreatePayload, DatasetItem, SourceSystemRead } from '@/types/datasets'

export { API_GetDataset, API_ListDatasets }

export async function API_ListSourceSystems(): Promise<SourceSystemRead[]> {
  const res = await http.get<SourceSystemRead[]>('/source-systems')
  return res.data
}

export async function API_CreateDataset(payload: DatasetCreatePayload): Promise<DatasetItem> {
  const res = await http.post<DatasetItem>('/datasets', payload)
  return res.data
}
