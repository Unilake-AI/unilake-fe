import { http } from '@/api/http'
import type { components, paths } from '@/api/schema'

type Schemas = components['schemas']

export type SilverProfileRead = Schemas['ProfileRead']
export type SilverProfileDefinition = Schemas['SourceProfile']
export type SilverProfileCreate = Schemas['ProfileCreate']
export type SilverProfileUpdate = Schemas['ProfileUpdate']
export type SilverProfileFilters = paths['/api/v1/pipeline/profiles']['get']['parameters']['query']

export async function API_ListProfiles(
  params?: SilverProfileFilters
): Promise<SilverProfileRead[]> {
  const res = await http.get<SilverProfileRead[]>('/pipeline/profiles', { params })
  return res.data
}

export async function API_GetProfile(profileId: string): Promise<SilverProfileRead> {
  const res = await http.get<SilverProfileRead>(
    `/pipeline/profiles/${encodeURIComponent(profileId)}`
  )
  return res.data
}

export async function API_CreateProfile(payload: SilverProfileCreate): Promise<SilverProfileRead> {
  const res = await http.post<SilverProfileRead>('/pipeline/profiles', payload)
  return res.data
}

export async function API_UpdateProfile(
  profileId: string,
  payload: SilverProfileUpdate
): Promise<SilverProfileRead> {
  const res = await http.put<SilverProfileRead>(
    `/pipeline/profiles/${encodeURIComponent(profileId)}`,
    payload
  )
  return res.data
}
