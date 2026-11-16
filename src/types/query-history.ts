export interface QueryHistoryEntry {
  id: string
  question: string
  status: 'COMPLETED' | 'NO_DATA' | 'FAILED'
  sql: string | null
  rowCount: number
  durationMs: number
  askedAt: string
  error?: string
}
