import { Suspense } from 'react'

import { LoadingState } from '@/components/page/page-parts'
import { ManagerAiView } from '@/views/manager/ai-view'

export default function ManagerAskPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ManagerAiView />
    </Suspense>
  )
}
