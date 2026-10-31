import { AnalyticsCompareView } from '@/views/dashboards/analytics-compare-view'

export const metadata = { title: 'Phân tích & So sánh | UniLake AI' }

export default function AnalyticsComparePage() {
  return <AnalyticsCompareView askHref="/manager/ask" />
}
