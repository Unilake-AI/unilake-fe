import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { ManagerApprovalsView } from './approvals-view'

vi.mock('next/image', () => ({ default: () => null }))
const originalAdapter = http.defaults.adapter
const profile = {
  profile_id: 'hr-positions',
  revision: 3,
  fingerprint: 'a'.repeat(64),
  status: 'PENDING',
  can_approve: true,
  can_revoke: false,
  definition: {
    domain: 'hr',
    entity: 'position',
    dataset_id: 31,
    source_table: 'positions.csv',
    field_mapping: { position_name: 'name' },
    ignored_columns: [],
    collapse_exact_duplicates: false,
  },
}
function setup(hasGrant = true) {
  const calls: { url?: string; data?: string }[] = []
  http.defaults.adapter = (config) => {
    calls.push(config)
    const data =
      config.url === '/manager/context'
        ? {
            user_id: 11,
            roles: ['HR_MANAGER'],
            domains: [{ domain: 'hr', name: 'Nhân sự' }],
            departments: [{ department_id: 7, department_code: 'PNS', department_name: 'Nhân sự' }],
          }
        : config.method === 'post'
          ? { status: 'APPROVED' }
          : {
              grants: hasGrant ? [{ grant_id: 'grant-1', domain: 'hr' }] : [],
              items: hasGrant ? [profile] : [],
            }
    return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config })
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  render(
    <QueryClientProvider client={client}>
      <ManagerApprovalsView />
    </QueryClientProvider>
  )
  return { calls, client }
}
afterEach(() => {
  http.defaults.adapter = originalAdapter
})
describe('ManagerApprovalsView', () => {
  it('không mở thao tác duyệt khi chưa có grant', async () => {
    const { client } = setup(false)
    expect(await screen.findByText('Bạn chưa được cấp quyền phê duyệt nguồn')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Phê duyệt phiên bản/ })).not.toBeInTheDocument()
    client.clear()
  })
  it('yêu cầu quyết định công bố từng phần và gửi chính xác revision/fingerprint/grant đang xem', async () => {
    const { calls, client } = setup()
    const button = await screen.findByRole('button', { name: 'Phê duyệt phiên bản 3' })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Căn cứ phê duyệt nghiệp vụ'), {
      target: { value: 'Đã đối chiếu ý nghĩa các trường' },
    })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'no' } })
    fireEvent.click(button)
    await waitFor(() => expect(calls.some((call) => call.url?.endsWith('/approve'))).toBe(true))
    const payload = JSON.parse(calls.find((call) => call.url?.endsWith('/approve'))!.data!)
    expect(payload).toEqual({
      expected_revision: 3,
      expected_fingerprint: 'a'.repeat(64),
      grant_id: 'grant-1',
      evidence: 'Đã đối chiếu ý nghĩa các trường',
      allow_partial_publication: false,
    })
    client.clear()
  })
})
