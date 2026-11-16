import { ManagerReportsView } from '@/views/manager/reports-view'

export const metadata = { title: 'Phân tích dữ liệu | UniLake AI' }

export default function ManagerPage() {
  return <ManagerReportsView mode="analytics" />
}
