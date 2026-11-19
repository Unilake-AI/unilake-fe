import { http } from '@/api/http'
import type { components } from '@/api/schema'

export type ReviewQueue = components['schemas']['ReviewQueue']
export type ReviewProfile = components['schemas']['ReviewProfile']

export interface ProfileRevisionItem {
  revision: number | string
  status: string
  fingerprint?: string
  created_by?: number | string | null
  actor_id?: number | string | null
  approved_by?: number | string | null
  revoked_by?: number | string | null
  created_at?: string | null
  approved_at?: string | null
  revoked_at?: string | null
  evidence?: string | null
  reason?: string | null
  note?: string | null
  revocation_reason?: string | null
  updated_by?: number | string | null
  updated_at?: string | null
  allow_partial_publication?: boolean | null
}

export const API_ReviewQueue = async () =>
  (await http.get<ReviewQueue>('/pipeline/profiles/review-queue')).data

export const API_ProfileRevisions = async (profileId: string): Promise<ProfileRevisionItem[]> => {
  const res = await http.get<
    | ProfileRevisionItem[]
    | {
        items?: ProfileRevisionItem[]
        revisions?: ProfileRevisionItem[]
        approvals?: ProfileRevisionItem[]
      }
  >(`/pipeline/profiles/${encodeURIComponent(profileId)}/revisions`)
  if (Array.isArray(res.data)) return res.data
  if (Array.isArray(res.data?.revisions)) {
    const approvals = res.data.approvals ?? []
    return res.data.revisions.map((revision) => {
      const approval = approvals.find((item) => String(item.revision) === String(revision.revision))
      return {
        ...revision,
        ...approval,
        actor_id: revision.actor_id ?? revision.created_by ?? revision.updated_by,
        created_at: revision.created_at ?? revision.updated_at,
        status: approval
          ? approval.revoked_at
            ? 'REVOKED'
            : 'APPROVED'
          : (revision.status ?? 'PENDING'),
      }
    })
  }
  if (Array.isArray(res.data?.items)) return res.data.items
  return []
}

export const API_ApproveProfile = async (
  profileId: string,
  payload: components['schemas']['ReviewRequest']
) =>
  (
    await http.post<{ status: string }>(
      `/pipeline/profiles/${encodeURIComponent(profileId)}/approve`,
      payload
    )
  ).data
export const API_RevokeApproval = async (profileId: string, revision: number, reason: string) =>
  (
    await http.post<{ status: string }>(
      `/pipeline/profiles/${encodeURIComponent(profileId)}/revisions/${revision}/revoke`,
      { reason }
    )
  ).data
