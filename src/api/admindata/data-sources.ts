import { http } from '@/api/http'
import type { components } from '@/api/schema'
import type { DataSourceCreatePayload, DataSourceItem } from '@/types/data-sources'

// Tạo mới nguồn dữ liệu
export async function API_CreateDataSource(
  payload: DataSourceCreatePayload
): Promise<DataSourceItem> {
  const res = await http.post<DataSourceItem>('/datasources/create', payload)
  return res.data
}

// Cập nhật hoặc bật/tắt nguồn dữ liệu
export async function API_UpdateDataSource(
  id: number,
  payload: Partial<DataSourceCreatePayload>
): Promise<DataSourceItem> {
  const res = await http.patch<DataSourceItem>(`/datasources/${id}`, payload)
  return res.data
}

export async function API_TestSourceConnection(
  configuration: Record<string, unknown>
): Promise<components['schemas']['DataSourceConnectionResult']> {
  return (
    await http.post<components['schemas']['DataSourceConnectionResult']>(
      '/datasources/test-connection',
      { source_type: 'POSTGRESQL', configuration }
    )
  ).data
}
