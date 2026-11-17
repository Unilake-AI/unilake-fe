import { redirect } from 'next/navigation'

export default function LegacyHistoryPage() {
  redirect('/manager/ask?tab=history')
}
