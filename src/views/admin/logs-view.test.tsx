import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { listAuditEvents, listDomainOwnerAuditEvents } from '@/api/admin/client'

import { LogsView } from './logs-view'

vi.mock('@/api/admin/client', () => ({
  listAuditEvents: vi.fn(),
  listDomainOwnerAuditEvents: vi.fn(),
}))

it('hiển thị kết quả, thay đổi và lịch sử Domain Owner', async () => {
  vi.mocked(listAuditEvents).mockResolvedValue([
    {
      event_id: 1,
      occurred_at: '2026-11-19T10:00:00',
      username: 'admin-test',
      action: 'ACCOUNT_ACCESS_UPDATED',
      target_id: 2,
      outcome: 'REJECTED',
      changes: null,
      error_code: 'ACCOUNT_CONFIGURATION_CONFLICT',
    },
  ])
  vi.mocked(listDomainOwnerAuditEvents).mockResolvedValue([
    {
      grant_id: 'f1f0f08f-d669-46ed-965f-789fa2b56316',
      user_id: 3,
      actor_id: '1',
      domain: 'hr',
      action: 'GRANTED',
      occurred_at: '2026-11-19T10:00:00Z',
      outcome: 'SUCCESS',
    },
  ])
  const queryClient = new QueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <LogsView />
    </QueryClientProvider>
  )
  expect(await screen.findByText('Bị từ chối', { exact: false })).toBeInTheDocument()
  expect(screen.getByText('ACCOUNT_CONFIGURATION_CONFLICT')).toBeInTheDocument()
  fireEvent.change(screen.getByRole('combobox', { name: 'Nhật ký' }), {
    target: { value: 'owners' },
  })
  expect(await screen.findByText('Cấp quyền Domain Owner')).toBeInTheDocument()
  expect(screen.getByText('Thành công')).toBeInTheDocument()
  expect(screen.getByText('Xem thay đổi')).toBeInTheDocument()
  expect(screen.getByText(/"domain": "hr"/)).toBeInTheDocument()
})
