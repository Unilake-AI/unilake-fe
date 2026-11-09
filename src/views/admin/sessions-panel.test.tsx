import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { SessionsPanel } from './sessions-panel'

vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ user: { id: '1' } }) }))

it('chỉ thu hồi phiên đã chọn sau xác nhận và tải lại danh sách', async () => {
  const trackRequest = vi.fn<(endpoint: string) => void>()
  const originalAdapter = http.defaults.adapter
  let revoked = false
  http.defaults.adapter = (config) => {
    const endpoint = `${config.method} ${config.url}`
    trackRequest(endpoint)
    if (endpoint === 'post /auth/revoke-session/7') revoked = true
    const data = revoked ? [] : [{ login_session_id: 7, login_at: '2026-11-09T08:00:00Z' }]
    return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config })
  }

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  try {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={client}>
        <SessionsPanel />
      </QueryClientProvider>
    )
    await user.click(await screen.findByRole('button', { name: 'Thu hồi phiên' }))
    expect(trackRequest.mock.calls).toEqual([['get /auth/sessions']])

    await user.click(screen.getByRole('button', { name: 'Xác nhận thu hồi' }))
    expect(await screen.findByText('Không có phiên đang hoạt động')).toBeInTheDocument()
    expect(trackRequest.mock.calls).toEqual([
      ['get /auth/sessions'],
      ['post /auth/revoke-session/7'],
      ['get /auth/sessions'],
    ])
  } finally {
    client.clear()
    http.defaults.adapter = originalAdapter
  }
})
