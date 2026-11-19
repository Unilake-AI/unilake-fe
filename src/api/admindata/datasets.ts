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

export interface OwnerDepartment {
  department_id: number
  department_code: string
  department_name: string
}

export async function API_OwnerDepartments(): Promise<OwnerDepartment[]> {
  return (await http.get<OwnerDepartment[]>('/dataset-owner-departments')).data
}

export async function API_ListDatasetOwnerDepartments(): Promise<OwnerDepartment[]> {
  return API_OwnerDepartments()
}

export async function API_SetDatasetOwner(
  id: number,
  owner: number,
  expected: number | null
): Promise<DatasetItem> {
  return (
    await http.patch<DatasetItem>(`/datasets/${id}/ownership`, {
      owner_department_id: owner,
      expected_owner_department_id: expected,
    })
  ).data
}
