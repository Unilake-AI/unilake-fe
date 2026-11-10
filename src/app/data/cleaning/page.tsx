import { CleaningView } from '@/views/data/cleaning-view'

export const metadata = { title: 'Làm sạch & Kiểm tra | UniLake AI' }

export default async function CleaningPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>
}) {
  const params = await searchParams
  const parsed = params.jobId ? Number(params.jobId) : NaN
  const initialJobId = Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
  return <CleaningView initialJobId={initialJobId} />
}
