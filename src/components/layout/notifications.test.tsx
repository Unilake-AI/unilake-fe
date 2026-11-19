import { createRef } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import { API_ListNotifications, API_MarkStaffNotificationRead } from '@/api/shared/notifications'

import { WorkspaceNotifications } from './notifications'

vi.mock('@/api/shared/notifications', () => ({
  API_ListNotifications: vi.fn(),
  API_MarkNotificationsRead: vi.fn(),
  API_MarkStaffNotificationRead: vi.fn(),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 14, username: 'hrstaff' } }),
}))

it('mở đúng yêu cầu xử lý và cập nhật số chưa đọc từ API Staff', async () => {
  const issueId = '87bf4eec-0de7-4b45-9d0c-f61332a4d49d'
  const timestamp = '2026-11-18T10:00:00Z'
  let read = false
  vi.mocked(API_ListNotifications).mockImplementation(() =>
    Promise.resolve({
      items: [
        {
          event_id: 21,
          notification_id: 21,
          issue_id: issueId,
          title: 'Sửa hồ sơ nhân sự',
          domain: 'hr',
          department_name: 'Phòng Nhân sự',
          event_type: 'ASSIGNED',
          to_status: 'ASSIGNED',
          actor_id: 1,
          created_at: timestamp,
          read_at: read ? timestamp : null,
          is_read: read,
        },
      ],
      total: 1,
      unread_count: read ? 0 : 1,
      limit: 20,
      offset: 0,
    })
  )
  vi.mocked(API_MarkStaffNotificationRead).mockImplementation(() => {
    read = true
    return Promise.resolve()
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={client}>
      <WorkspaceNotifications workspace="STAFF" fallbackFocus={createRef<HTMLButtonElement>()} />
    </QueryClientProvider>
  )

  await user.click(await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' }))
  expect(API_ListNotifications).toHaveBeenCalledWith('STAFF', 0)
  expect(screen.getByRole('link', { name: 'Sửa hồ sơ nhân sự' })).toHaveAttribute(
    'href',
    `/staff/quality-issues/${issueId}`
  )
  await user.click(screen.getByRole('button', { name: 'Đánh dấu đã đọc' }))
  expect(API_MarkStaffNotificationRead).toHaveBeenCalledWith(21)
  await waitFor(() => {
    expect(screen.queryByRole('button', { name: 'Đánh dấu đã đọc' })).toBeNull()
  })
  await user.click(screen.getByRole('button', { name: 'Đóng thông báo' }))
  expect(screen.getByRole('button', { name: 'Thông báo' })).toBeInTheDocument()
})
