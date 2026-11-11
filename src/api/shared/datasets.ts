import { http } from '@/api/http'
import type { DatasetFilters, DatasetItem } from '@/types/datasets'

export async function API_ListDatasets(params?: DatasetFilters): Promise<DatasetItem[]> {
  const res = await http.get<DatasetItem[]>('/datasets', { params })
  return res.data
}

export async function API_GetDataset(datasetId: number): Promise<DatasetItem> {
  const res = await http.get<DatasetItem>(`/datasets/${datasetId}`)
  return res.data
}
