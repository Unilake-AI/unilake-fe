/**
 * Lịch sử câu hỏi Hỏi AI lưu trên trình duyệt của người dùng.
 * Backend chưa có API `query-history`; khi có sẽ thay bằng dữ liệu từ server.
 */
import type { QueryHistoryEntry } from '@/types/query-history'

export const QUERY_HISTORY_KEY = 'unilake.queryHistory'
const MAX_ENTRIES = 100

function historyKey(): string | null {
  try {
    const user = JSON.parse(localStorage.getItem('user') ?? 'null') as {
      app_user_id?: number
      user_id?: number
      id?: string | number
    } | null
    const id = user?.user_id ?? user?.app_user_id ?? user?.id
    return id ? `${QUERY_HISTORY_KEY}:${id}` : null
  } catch {
    return null
  }
}

export function readQueryHistory(): QueryHistoryEntry[] {
  try {
    const key = historyKey()
    if (!key) return []
    const raw = localStorage.getItem(key)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as QueryHistoryEntry[]) : []
  } catch {
    return []
  }
}

export function addQueryHistory(entry: QueryHistoryEntry): void {
  try {
    const key = historyKey()
    if (!key) return
    const next = [entry, ...readQueryHistory()].slice(0, MAX_ENTRIES)
    localStorage.setItem(key, JSON.stringify(next))
  } catch {
    // Trình duyệt chặn lưu trữ: bỏ qua, không ảnh hưởng câu trả lời.
  }
}

export function clearQueryHistory(): void {
  try {
    const key = historyKey()
    if (key) localStorage.removeItem(key)
  } catch {
    // bỏ qua
  }
}
