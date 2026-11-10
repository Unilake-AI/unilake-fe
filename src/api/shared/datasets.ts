import { http } from '@/api/http'
import type { components, paths } from '@/api/schema'

type Schemas = components['schemas']

export type DatasetItem = Schemas['DatasetRead']
export type DatasetFilters = paths['/api/v1/datasets']['get']['parameters']['query']

export async function API_ListDatasets(params?: DatasetFilters): Promise<DatasetItem[]> {
  const res = await http.get<DatasetItem[]>('/datasets', { params })
  return res.data
}

export async function API_GetDataset(datasetId: number): Promise<DatasetItem> {
  const res = await http.get<DatasetItem>(`/datasets/${datasetId}`)
  return res.data
}
