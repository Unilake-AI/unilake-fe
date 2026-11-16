import { redirect } from 'next/navigation'

export default async function AutoPipelineRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>
}) {
  const params = await searchParams
  const qs = params.jobId ? `?jobId=${params.jobId}` : ''
  redirect(`/data/pipeline${qs}`)
}
