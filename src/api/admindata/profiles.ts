import { http } from '@/api/http'
import type {
  SilverProfileCreate,
  SilverProfileFilters,
  SilverProfileRead,
  SilverProfileUpdate,
} from '@/types/silver-profiles'

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
