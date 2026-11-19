import { ManagerReportsView } from '@/views/manager/reports-view'

export const metadata = { title: 'Theo dõi chất lượng dữ liệu | UniLake AI' }

export default function ManagerIssuesPage() {
  return <ManagerReportsView mode="issues" />
}
