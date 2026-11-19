import { http } from '@/api/http'
import type { NlqResponse } from '@/types/nlq'

// Hỏi đáp AI bằng ngôn ngữ tự nhiên
export async function API_AskNlq(
  question: string,
  options?: 'STAFF' | { workspace?: 'STAFF'; domain?: string }
): Promise<NlqResponse> {
  const workspace = typeof options === 'string' ? options : options?.workspace
  const domain = typeof options === 'object' ? options?.domain : undefined
  const body = domain ? { question, domain } : { question }
  const res = await http.post<NlqResponse>(
    '/nlq/ask',
    body,
    workspace ? { params: { workspace } } : undefined
  )
  return res.data
}
