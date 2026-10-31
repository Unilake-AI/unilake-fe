import { DomainOverviewView } from '@/views/dashboards/domain-overview-view'

export const metadata = { title: 'Tổng quan phân hệ | UniLake AI' }

export default function DomainOverviewPage() {
  return <DomainOverviewView askHref="/analyst/ask" />
}
