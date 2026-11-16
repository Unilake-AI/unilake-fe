export interface SilverSnapshotListItem {
  snapshot_id: string
  scope: string
  request_hash?: string | null
}

export interface SilverSnapshotListResponse {
  scope: string
  active_snapshot_id: string | null
  items: SilverSnapshotListItem[]
}

export type SilverSnapshotManifest = Record<string, unknown>

export interface SilverActiveSnapshotResponse {
  snapshot_id: string | null
  scope: string
  manifest: SilverSnapshotManifest | null
}

export interface SilverSnapshotDataResponse {
  snapshot_id: string
  entity: string
  total: number
  limit: number
  offset: number
  items: Array<Record<string, unknown>>
}

export interface SilverSnapshotActivateResponse {
  snapshot_id: string
  scope: string
  previous_snapshot_id: string | null
}
