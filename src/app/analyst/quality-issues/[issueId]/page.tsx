import { StaffQualityIssueDetailView } from '@/views/staff/staff-quality-issue-detail-view'

export const metadata = { title: 'Chi tiết yêu cầu xử lý dữ liệu lỗi | UniLake AI' }

export default async function StaffQualityIssueDetailPage({
  params,
}: {
  params: Promise<{ issueId: string }>
}) {
  const { issueId } = await params
  return <StaffQualityIssueDetailView issueId={issueId} />
}
