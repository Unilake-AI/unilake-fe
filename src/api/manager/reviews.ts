import { http } from '@/api/http'
import type { components } from '@/api/schema'

export type ReviewQueue = components['schemas']['ReviewQueue']
export type ReviewProfile = components['schemas']['ReviewProfile']
export const API_ReviewQueue = async () =>
  (await http.get<ReviewQueue>('/pipeline/profiles/review-queue')).data
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
