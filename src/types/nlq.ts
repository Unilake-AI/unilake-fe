export interface NlqResponse {
  sql: string
  rows: Record<string, unknown>[]
}

export interface NlqConversationTurn {
  id: number
  question: string
  state: 'processing' | 'done' | 'error'
  result?: NlqResponse
  error?: string
  durationMs?: number
}
