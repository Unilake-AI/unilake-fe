import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getInitials, UserMenu } from './user-menu'

const logout = vi.fn()

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      username: 'academic_staff',
      fullName: 'Trần Thị Mai Phương',
      roles: ['ACADEMIC_STAFF', 'VIEWER'],
    },
    roles: ['ACADEMIC_STAFF', 'VIEWER'],
    logout,
    isLoggingOut: false,
  }),
}))

describe('getInitials', () => {
  it('uses the last two words of a full name', () => {
    expect(getInitials('Trần Thị Mai Phương')).toBe('MP')
  })

  it('uses the first two letters of a single-word username', () => {
    expect(getInitials('academic_staff')).toBe('AC')
  })

  it('falls back to U for an empty name', () => {
    expect(getInitials('   ')).toBe('U')
  })
})

describe('UserMenu', () => {
  beforeEach(() => {
    logout.mockReset()
  })

  it('expands account actions directly under the user name and logs out', async () => {
    const user = userEvent.setup()
    render(<UserMenu role="ACADEMIC_STAFF" />)

    const trigger = screen.getByRole('button', { name: 'Mở menu người dùng' })
    expect(trigger).toHaveTextContent('Trần Thị Mai Phương')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Cài đặt' })).not.toBeInTheDocument()

    await user.click(trigger)

    const settings = screen.getByRole('button', { name: 'Cài đặt' })
    const logoutButton = screen.getByRole('button', { name: 'Đăng xuất' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById(trigger.getAttribute('aria-controls')!)).toContainElement(
      settings
    )
    expect(settings.parentElement).toContainElement(logoutButton)
    await user.click(logoutButton)
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('opens account settings with the staff profile and workspace links', async () => {
    const user = userEvent.setup()
    render(<UserMenu role="ACADEMIC_STAFF" />)

    await user.click(screen.getByRole('button', { name: 'Mở menu người dùng' }))
    await user.click(screen.getByRole('button', { name: 'Cài đặt' }))

    expect(screen.getByRole('dialog', { name: 'Cài đặt tài khoản' })).toHaveTextContent(
      'Nhân viên Đào tạo'
    )
    expect(screen.getByRole('link', { name: 'Hồ sơ cá nhân và phiên đăng nhập' })).toHaveAttribute(
      'href',
      '/staff/profile'
    )
    expect(screen.getByRole('link', { name: /Ban Giám hiệu/ })).toHaveAttribute('href', '/viewer')
  })
})
