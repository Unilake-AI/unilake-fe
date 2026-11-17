import { http } from '@/api/http'
import type { components, paths } from '@/api/schema'

export type ManagerRecord = components['schemas']['ManagerRecord']
export type RecordPage = components['schemas']['RecordPage']
export type RecordType = components['schemas']['RecordType']
export type ManagerDomain = RecordPage['domain']
export type RecordFilters =
  paths['/api/v1/manager/{domain}/records/{entity}']['get']['parameters']['query']
export type DatabaseSyncStats = components['schemas']['DatabaseSyncStats']

export const API_ManagerRecordTypes = async (domain: ManagerDomain) =>
  (await http.get<RecordType[]>(`/manager/${domain}/record-types`)).data
export const API_ManagerRecords = async (
  domain: ManagerDomain,
  entity: string,
  params: RecordFilters
) =>
  (
    await http.get<RecordPage>(`/manager/${domain}/records/${encodeURIComponent(entity)}`, {
      params,
    })
  ).data
export const API_ManagerRecord = async (domain: ManagerDomain, entity: string, id: number) =>
  (await http.get<ManagerRecord>(`/manager/${domain}/records/${encodeURIComponent(entity)}/${id}`))
    .data
