import { StaffIngestionView } from '@/views/staff/staff-ingestion-view'

export const metadata = { title: 'Lịch sử nạp dữ liệu | UniLake AI' }

export default async function StaffIngestionPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>
}) {
  const params = await searchParams
  const parsed = params.jobId ? Number(params.jobId) : NaN
  const initialJobId = Number.isInteger(parsed) && parsed > 0 ? parsed : undefined

  return <StaffIngestionView initialJobId={initialJobId} />
}
