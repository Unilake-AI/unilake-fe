import { DomainOverviewView } from '@/views/dashboards/domain-overview-view'

export const metadata = { title: 'Dashboard phân hệ | UniLake AI' }

export default function DomainOverviewPage() {
  return <DomainOverviewView askHref="/viewer/ask" />
}
