import { Suspense } from 'react'

import { LoadingState } from '@/components/page/page-parts'
import { ManagerAiView } from '@/views/manager/ai-view'

export const metadata = { title: 'Hỏi UniLake AI | UniLake AI' }

export default function ManagerAiPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ManagerAiView />
    </Suspense>
  )
}
