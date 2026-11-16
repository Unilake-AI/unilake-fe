import { ManagerReportsView } from '@/views/manager/reports-view'

export const metadata = { title: 'Bộ dữ liệu phòng ban | UniLake AI' }

export default function ManagerPage() {
  return <ManagerReportsView mode="datasets" />
}
