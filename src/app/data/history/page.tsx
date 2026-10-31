import { QueryHistoryView } from '@/views/shared/query-history-view'

export const metadata = { title: 'Lịch sử truy vấn | UniLake AI' }

export default function QueryHistoryPage() {
  return <QueryHistoryView askHref="/data/ask" />
}
