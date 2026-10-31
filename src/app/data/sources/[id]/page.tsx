import { notFound } from 'next/navigation'

import { SourceEditView } from '@/views/data/source-form-view'

export const metadata = { title: 'Chỉnh sửa nguồn dữ liệu | UniLake AI' }

export default async function SourceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sourceId = Number(id)
  if (!Number.isInteger(sourceId) || sourceId <= 0) {
    notFound()
  }
  return <SourceEditView id={sourceId} />
}
