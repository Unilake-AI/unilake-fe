import { ManagerIssueDetailView } from '@/views/manager/issue-detail-view'

export const metadata = { title: 'Yêu cầu xử lý lỗi | UniLake AI' }

export default async function ManagerIssuePage({
  params,
}: {
  params: Promise<{ issueId: string }>
}) {
  const { issueId } = await params
  return <ManagerIssueDetailView issueId={issueId} />
}
