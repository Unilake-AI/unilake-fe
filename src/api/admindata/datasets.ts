import { http } from '@/api/http'
import type { components } from '@/api/schema'
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

export async function API_CreateSourceSystem(
  payload: components['schemas']['SourceSystemCreate']
): Promise<SourceSystemRead> {
  return (await http.post<SourceSystemRead>('/source-systems', payload)).data
}

export async function API_ListDatasetOwnerDepartments(): Promise<
  { department_id: number; department_code: string; department_name: string }[]
> {
  return (
    await http.get<{ department_id: number; department_code: string; department_name: string }[]>(
      '/dataset-owner-departments'
    )
  ).data
}
