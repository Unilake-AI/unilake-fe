import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getInitials, UserMenu } from './user-menu'

const logout = vi.fn()

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { username: 'analyst', fullName: 'Trần Thị Mai Phương', roles: ['ANALYST', 'VIEWER'] },
    roles: ['ANALYST', 'VIEWER'],
    logout,
    isLoggingOut: false,
  }),
}))

describe('getInitials', () => {
  it('uses the last two words of a full name', () => {
    expect(getInitials('Trần Thị Mai Phương')).toBe('MP')
  })

  it('uses the first two letters of a single-word username', () => {
    expect(getInitials('analyst')).toBe('AN')
  })

  it('falls back to U for an empty name', () => {
    expect(getInitials('   ')).toBe('U')
  })
})

describe('UserMenu', () => {
  beforeEach(() => {
    logout.mockReset()
  })

  it('shows the user name and current role on the trigger', () => {
    render(<UserMenu role="ANALYST" />)

    const trigger = screen.getByRole('button', { name: 'Mở menu người dùng' })
    expect(trigger).toHaveTextContent('Trần Thị Mai Phương')
    expect(trigger).toHaveTextContent('[ANALYST]')
  })

  it('lists the workspaces the user can switch to and logs out', async () => {
    const user = userEvent.setup()
    render(<UserMenu role="ANALYST" />)

    await user.click(screen.getByRole('button', { name: 'Mở menu người dùng' }))

    expect(await screen.findByRole('menuitem', { name: /Chuyên viên Phân tích/ })).toHaveAttribute(
      'href',
      '/analyst'
    )
    expect(screen.getByRole('menuitem', { name: /Ban Giám hiệu/ })).toHaveAttribute(
      'href',
      '/viewer'
    )

    await user.click(screen.getByRole('menuitem', { name: 'Đăng xuất' }))
    expect(logout).toHaveBeenCalledTimes(1)
  })
})
