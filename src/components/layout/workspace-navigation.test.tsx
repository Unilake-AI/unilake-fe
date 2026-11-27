import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getMenuItemsForRole } from '@/config/menu'
import { ROLE_PRIORITY } from '@/config/roles'

import { WorkspaceNavigation } from './workspace-navigation'

vi.mock('next/navigation', () => ({
  usePathname: () => '/staff/quality-issues/42',
}))

vi.mock('./domain-selector', () => ({
  DomainSelector: () => null,
}))

vi.mock('./notifications', () => ({
  WorkspaceNotifications: () => <button>Thông báo</button>,
}))

vi.mock('./user-menu', () => ({
  UserMenu: () => <button>Hồ sơ</button>,
}))

describe('WorkspaceNavigation', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each(ROLE_PRIORITY)('hiển thị các mục menu của %s mà không có tiêu đề nhóm', async (role) => {
    const user = userEvent.setup()
    render(<WorkspaceNavigation role={role} />)
    await user.click(screen.getByRole('button', { name: 'Menu' }))

    const navigation = within(screen.getByRole('navigation', { name: 'Điều hướng chính' }))
    expect(navigation.queryByRole('heading', { hidden: true })).not.toBeInTheDocument()
    expect(navigation.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(
      getMenuItemsForRole(role).map((item) => item.href)
    )
  })

  it('thu gọn bằng Escape và trả focus về nút mở rộng', async () => {
    const user = userEvent.setup()
    render(<WorkspaceNavigation role="HR_STAFF" />)

    const toggle = screen.getByRole('button', { name: 'Menu' })
    await user.click(toggle)
    expect(toggle).toHaveAccessibleName('Đóng')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    const activeLink = screen.getByRole('link', { name: 'Yêu cầu xử lý dữ liệu lỗi' })
    expect(activeLink).toHaveAttribute('aria-current', 'page')
    activeLink.focus()
    await user.keyboard('{Escape}')

    expect(toggle).toHaveAccessibleName('Menu')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
  })

  it('chia trang khi màn hình thấp và vẫn truy cập được đủ mục', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    const user = userEvent.setup()
    render(<WorkspaceNavigation role="DATA_ADMIN" />)
    await user.click(screen.getByRole('button', { name: 'Menu' }))

    const navigation = within(screen.getByRole('navigation', { name: 'Điều hướng chính' }))
    const nextPage = navigation.getByRole('button', { name: 'Trang sau' })
    expect(navigation.getByRole('button', { name: 'Trang trước' })).toBeDisabled()
    const allLinks = navigation.getAllByRole('link').map((link) => link.getAttribute('href'))
    expect(allLinks).toHaveLength(4)
    expect(nextPage).toBeEnabled()

    while (!(nextPage as HTMLButtonElement).disabled) {
      await user.click(nextPage)
      allLinks.push(...navigation.getAllByRole('link').map((link) => link.getAttribute('href')))
    }
    expect(allLinks).toEqual(getMenuItemsForRole('DATA_ADMIN').map(({ href }) => href))

    await user.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(screen.queryByRole('navigation', { name: 'Điều hướng chính' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    expect(navigation.getByRole('button', { name: 'Trang trước' })).toBeDisabled()
  })
})
