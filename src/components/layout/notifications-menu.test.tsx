import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'
import { issueNotificationHref } from '@/api/shared/notifications'

import { NotificationsMenu } from './notifications-menu'

vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ user: { id: '11' } }) }))
const original = http.defaults.adapter
const notification = {
  event_id: 17,
  issue_id: 'issue-17',
  title: 'Sửa dữ liệu tuyển sinh',
  domain: 'admissions',
  department_name: 'Phòng tuyển sinh',
  event_type: 'ASSIGNED',
  to_status: 'ASSIGNED',
  actor_id: 1,
  created_at: '2026-11-16T01:00:00Z',
  read_at: null,
}

afterEach(() => {
  http.defaults.adapter = original
})

describe('NotificationsMenu', () => {
  it.each([
    ['ADMIN', '/admin/quality-issues/issue-17'],
    ['DATA_ADMIN', '/data/quality/issue-17'],
    ['MANAGER', '/manager/quality-issues/issue-17'],
    ['STAFF', '/staff/quality-issues/issue-17'],
  ] as const)(
    'mở đúng yêu cầu cho workspace %s, không tự đánh dấu khi mở menu',
    async (workspace, href) => {
      const calls: string[] = []
      http.defaults.adapter = (config) => {
        calls.push(`${config.method} ${config.url}`)
        expect(config.params).toMatchObject({ workspace })
        return Promise.resolve({
          data: { items: [notification], unread_count: 1, total: 1, limit: 10, offset: 0 },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      render(
        <QueryClientProvider client={client}>
          <NotificationsMenu workspace={workspace} />
        </QueryClientProvider>
      )
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Thông báo: 1 chưa đọc' }))
      expect(
        await screen.findByRole('menuitem', { name: /Sửa dữ liệu tuyển sinh/ })
      ).toHaveAttribute('href', href)
      expect(calls).not.toContain('post /notifications/read')
      expect(issueNotificationHref(workspace, 'issue-17')).toBe(href)
      client.clear()
    }
  )

  it('lưu trạng thái đọc qua API và cập nhật badge sau khi thành công', async () => {
    const bodies: unknown[] = []
    let read = false
    http.defaults.adapter = (config) => {
      if (config.method === 'post') {
        bodies.push(JSON.parse(config.data as string))
        read = true
      }
      return Promise.resolve({
        data:
          config.method === 'post'
            ? undefined
            : {
                items: [{ ...notification, read_at: read ? notification.created_at : null }],
                unread_count: read ? 0 : 1,
                total: 1,
                limit: 10,
                offset: 0,
              },
        status: config.method === 'post' ? 204 : 200,
        statusText: 'OK',
        headers: {},
        config,
      })
    }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <NotificationsMenu workspace="MANAGER" />
      </QueryClientProvider>
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Thông báo: 1 chưa đọc' }))
    await user.click(screen.getByRole('button', { name: 'Đọc trang này' }))
    await waitFor(() => expect(bodies).toEqual([{ event_ids: [17] }]))
    await user.keyboard('{Escape}')
    expect(await screen.findByRole('button', { name: 'Thông báo: 0 chưa đọc' })).toBeInTheDocument()
    client.clear()
  })

  it('không dùng dữ liệu giả khi thông báo lỗi', async () => {
    http.defaults.adapter = (config) =>
      Promise.reject(
        new AxiosError('unavailable', 'ERR_BAD_RESPONSE', config, undefined, {
          status: 503,
          statusText: 'Unavailable',
          headers: new AxiosHeaders(),
          config,
          data: {},
        })
      )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <NotificationsMenu workspace="STAFF" />
      </QueryClientProvider>
    )
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Thông báo không tải được' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText(notification.title)).not.toBeInTheDocument()
    client.clear()
  })
})
