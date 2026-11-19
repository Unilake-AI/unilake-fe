import { ManagerReportsView } from '@/views/manager/reports-view'

export const metadata = { title: 'Tổng quan phòng ban | UniLake AI' }

export default function ManagerOverviewPage() {
  return <ManagerReportsView mode="overview" />
}
