import { http } from '@/api/http'
import type { DataSourceFilter, DataSourceItem, DataSourceListResponse } from '@/types/data'

// Lấy danh sách nguồn dữ liệu
export async function API_ListDataSources(
  filter: DataSourceFilter
): Promise<DataSourceListResponse> {
  const res = await http.get<DataSourceListResponse>('/datasources', { params: filter })
  return res.data
}

// Lấy chi tiết nguồn dữ liệu theo ID
export async function API_GetDataSource(id: number): Promise<DataSourceItem> {
  const res = await http.get<DataSourceItem>(`/datasources/${id}`)
  return res.data
}
