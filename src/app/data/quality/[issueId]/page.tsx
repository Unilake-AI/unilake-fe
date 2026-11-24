import { PageHeader } from '@/components/page/page-parts'
import { IssueDetailPanel } from '@/views/data/quality-view'

export const metadata = { title: 'Yêu cầu xử lý lỗi | UniLake AI' }

export default async function DataIssuePage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params
  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Yêu cầu xử lý lỗi']}
        title="Chi tiết yêu cầu xử lý lỗi"
      />
      <IssueDetailPanel issueId={issueId} />
    </div>
  )
}
