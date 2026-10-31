import { existsSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { ASK_AI_PATHS, ROLE_MENUS } from './menu'
import { ROLE_DEFINITIONS, getRoleFromPrefix } from './roles'

function pageFile(href: string): string {
  return path.join(process.cwd(), 'src/app', href, 'page.tsx')
}

describe('ROLE_MENUS', () => {
  const entries = Object.entries(ROLE_MENUS)

  it.each(entries)('mọi mục menu của %s đều có trang và thuộc đúng vai trò', (role, groups) => {
    for (const item of groups.flatMap((group) => group.items)) {
      expect(existsSync(pageFile(item.href)), `${item.href} chưa có page.tsx`).toBe(true)
      expect(getRoleFromPrefix(item.href)).toBe(role)
    }
  })

  it('mục đầu tiên của mỗi vai trò là trang chủ của vai trò đó', () => {
    for (const [role, groups] of entries) {
      expect(groups[0]?.items[0]?.href).toBe(
        ROLE_DEFINITIONS[role as keyof typeof ROLE_DEFINITIONS].homePath
      )
    }
  })

  it('nút Ask AI trỏ tới trang có trong menu của vai trò, ADMIN không có', () => {
    expect(ASK_AI_PATHS.ADMIN).toBeUndefined()
    for (const [role, href] of Object.entries(ASK_AI_PATHS)) {
      const hrefs = ROLE_MENUS[role as keyof typeof ROLE_MENUS].flatMap((g) =>
        g.items.map((i) => i.href)
      )
      expect(hrefs).toContain(href)
    }
  })
})
