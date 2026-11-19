import { AutoPipelineView } from '@/views/data/auto-pipeline-view'

export const metadata = { title: 'Tiến trình nạp & xử lý dữ liệu | UniLake AI' }

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>
}) {
  const params = await searchParams
  const id = Number(params.jobId)
  return <AutoPipelineView initialJobId={Number.isSafeInteger(id) && id > 0 ? id : undefined} />
}
