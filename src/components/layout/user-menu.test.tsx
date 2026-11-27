import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'next-themes'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
  const storageKey = 'workspace-test-theme'

  beforeEach(() => {
    logout.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.removeItem(storageKey)
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.style.removeProperty('color-scheme')
  })

  it('expands account actions directly under the user name and logs out', async () => {
    const user = userEvent.setup()
    render(<UserMenu role="ACADEMIC_STAFF" />)

    const trigger = screen.getByRole('button', { name: 'Mở menu người dùng' })
    expect(trigger).toHaveTextContent('Trần Thị Mai Phương')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Chế độ giao diện' })).not.toBeInTheDocument()

    await user.click(trigger)

    const settings = screen.getByRole('button', { name: 'Chế độ giao diện' })
    const logoutButton = screen.getByRole('button', { name: 'Đăng xuất' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById(trigger.getAttribute('aria-controls')!)).toContainElement(
      settings
    )
    expect(settings.parentElement).toContainElement(logoutButton)
    await user.click(logoutButton)
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['VIEWER', '/profile'],
    ['ACADEMIC_STAFF', '/profile?role=ACADEMIC_STAFF'],
  ] as const)('mở trang hồ sơ trực tiếp và giữ không gian %s', async (role, href) => {
    const user = userEvent.setup()
    render(<UserMenu role={role} />)

    await user.click(screen.getByRole('button', { name: 'Mở menu người dùng' }))
    expect(screen.getByRole('link', { name: 'Hồ sơ cá nhân' })).toHaveAttribute('href', href)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Chế độ giao diện' }))
    expect(screen.getByRole('dialog', { name: 'Chế độ giao diện' })).toBeVisible()
  })

  it('đổi giao diện trong cài đặt và giữ lựa chọn khi mở lại', async () => {
    const user = userEvent.setup()
    const prefersDark = {
      matches: true,
      addListener: vi.fn<(listener: (event: MediaQueryListEvent) => void) => void>(),
      removeListener: vi.fn(),
    }
    vi.stubGlobal('matchMedia', () => prefersDark)
    const settings = () => (
      <ThemeProvider attribute="class" defaultTheme="system" storageKey={storageKey}>
        <UserMenu role="ACADEMIC_STAFF" />
      </ThemeProvider>
    )
    const openSettings = async () => {
      await user.click(screen.getByRole('button', { name: 'Mở menu người dùng' }))
      await user.click(screen.getByRole('button', { name: 'Chế độ giao diện' }))
    }

    const first = render(settings())
    await openSettings()
    expect(screen.getByRole('radio', { name: 'Hệ thống' })).toBeChecked()
    expect(document.documentElement).toHaveClass('dark')
    await user.click(screen.getByRole('radio', { name: 'Sáng' }))
    expect(screen.getByRole('radio', { name: 'Sáng' })).toBeChecked()
    expect(document.documentElement).toHaveClass('light')
    expect(localStorage.getItem(storageKey)).toBe('light')

    first.unmount()
    render(settings())
    await openSettings()
    expect(screen.getByRole('radio', { name: 'Sáng' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'Tối' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem(storageKey)).toBe('dark')

    await user.click(screen.getByRole('radio', { name: 'Hệ thống' }))
    expect(localStorage.getItem(storageKey)).toBe('system')
    const handleSystemChange = prefersDark.addListener.mock.lastCall?.[0]
    expect(handleSystemChange).toBeDefined()
    prefersDark.matches = false
    act(() => {
      handleSystemChange?.(
        Object.assign(new Event('change'), {
          matches: prefersDark.matches,
          media: '(prefers-color-scheme: dark)',
        })
      )
    })
    expect(document.documentElement).toHaveClass('light')
    expect(screen.getByRole('radio', { name: 'Hệ thống' })).toBeChecked()
  })
})
