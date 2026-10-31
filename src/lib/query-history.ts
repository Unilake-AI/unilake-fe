/**
 * Lịch sử câu hỏi Hỏi AI lưu trên trình duyệt của người dùng.
 * Backend chưa có API `query-history`; khi có sẽ thay bằng dữ liệu từ server.
 */
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

export const QUERY_HISTORY_KEY = 'unilake.queryHistory'
const MAX_ENTRIES = 100

export function readQueryHistory(): QueryHistoryEntry[] {
  try {
    const raw = localStorage.getItem(QUERY_HISTORY_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as QueryHistoryEntry[]) : []
  } catch {
    return []
  }
}

export function addQueryHistory(entry: QueryHistoryEntry): void {
  try {
    const next = [entry, ...readQueryHistory()].slice(0, MAX_ENTRIES)
    localStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(next))
  } catch {
    // Trình duyệt chặn lưu trữ: bỏ qua, không ảnh hưởng câu trả lời.
  }
}

export function clearQueryHistory(): void {
  try {
    localStorage.removeItem(QUERY_HISTORY_KEY)
  } catch {
    // bỏ qua
  }
}
