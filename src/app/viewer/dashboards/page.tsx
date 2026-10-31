import { DomainsCompareView } from '@/views/dashboards/domains-compare-view'

export const metadata = { title: 'Dashboard theo phân hệ | UniLake AI' }

export default function DomainsComparePage() {
  return <DomainsCompareView detailHref="/viewer/dashboards/detail" />
}
