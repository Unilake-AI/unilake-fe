import { http } from '@/api/http'
import type {
  SilverActiveSnapshotResponse,
  SilverSnapshotActivateResponse,
  SilverSnapshotDataResponse,
  SilverSnapshotListResponse,
  SilverSnapshotManifest,
} from '@/types/silver-snapshots'

export async function API_ListSnapshots(params: {
  profile_id: string
  limit?: number
  offset?: number
}): Promise<SilverSnapshotListResponse> {
  const res = await http.get<SilverSnapshotListResponse>('/pipeline/silver/snapshots', { params })
  return res.data
}

export async function API_GetActiveSnapshot(
  profileId: string
): Promise<SilverActiveSnapshotResponse> {
  const res = await http.get<SilverActiveSnapshotResponse>('/pipeline/silver/snapshots/active', {
    params: { profile_id: profileId },
  })
  return res.data
}

export async function API_GetSnapshot(
  snapshotId: string,
  profileId: string
): Promise<SilverSnapshotManifest> {
  const res = await http.get<SilverSnapshotManifest>(
    `/pipeline/silver/snapshots/${encodeURIComponent(snapshotId)}`,
    { params: { profile_id: profileId } }
  )
  return res.data
}

export async function API_GetSnapshotData(params: {
  snapshotId: string
  profileId: string
  entity: string
  limit?: number
  offset?: number
}): Promise<SilverSnapshotDataResponse> {
  const res = await http.get<SilverSnapshotDataResponse>(
    `/pipeline/silver/snapshots/${encodeURIComponent(params.snapshotId)}/data`,
    {
      params: {
        profile_id: params.profileId,
        entity: params.entity,
        limit: params.limit ?? 20,
        offset: params.offset ?? 0,
      },
    }
  )
  return res.data
}

export async function API_ActivateSnapshot(
  snapshotId: string,
  profileId: string,
  expectedCurrentSnapshot: string | null
): Promise<SilverSnapshotActivateResponse> {
  const res = await http.post<SilverSnapshotActivateResponse>(
    `/pipeline/silver/snapshots/${encodeURIComponent(snapshotId)}/activate`,
    { expected_current_snapshot: expectedCurrentSnapshot },
    { params: { profile_id: profileId } }
  )
  return res.data
}
