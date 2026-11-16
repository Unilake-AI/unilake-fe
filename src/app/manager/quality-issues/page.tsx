import { ManagerReportsView } from '@/views/manager/reports-view'

export const metadata = { title: 'Yêu cầu sửa dữ liệu | UniLake AI' }

export default function ManagerPage() {
  return <ManagerReportsView mode="issues" />
}
