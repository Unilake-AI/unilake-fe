import { http } from '@/api/http'
import type { NlqResponse } from '@/types/data'

// Hỏi đáp AI bằng ngôn ngữ tự nhiên
export async function API_AskNlq(question: string): Promise<NlqResponse> {
  const res = await http.post<NlqResponse>('/nlq/ask', { question })
  return res.data
}
