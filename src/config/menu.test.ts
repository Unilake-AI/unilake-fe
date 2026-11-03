import { existsSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { ASK_AI_PATHS, ROLE_MENUS } from './menu'
import {
  ROLE_DEFINITIONS,
  ROLE_PRIORITY,
  getWorkspaceForRole,
  getWorkspaceFromPrefix,
} from './roles'

function pageFile(href: string): string {
  return path.join(process.cwd(), 'src/app', href, 'page.tsx')
}

describe('ROLE_MENUS', () => {
  const entries = Object.entries(ROLE_MENUS)

  it.each(entries)(
    'mọi mục menu của %s đều có trang và thuộc đúng không gian',
    (workspace, groups) => {
      for (const item of groups.flatMap((group) => group.items)) {
        expect(existsSync(pageFile(item.href)), `${item.href} chưa có page.tsx`).toBe(true)
        expect(getWorkspaceFromPrefix(item.href)).toBe(workspace)
      }
    }
  )

  it('mục đầu tiên của mỗi vai trò là trang chủ của vai trò đó', () => {
    for (const role of ROLE_PRIORITY) {
      const groups = ROLE_MENUS[getWorkspaceForRole(role)]
      expect(groups[0]?.items[0]?.href).toBe(ROLE_DEFINITIONS[role].homePath)
    }
  })

  it('nút Ask AI trỏ tới trang có trong menu; VIEWER chỉ có dashboard', () => {
    expect(ASK_AI_PATHS.ADMIN).toBeUndefined()
    expect(ASK_AI_PATHS.VIEWER).toBeUndefined()
    for (const [workspace, href] of Object.entries(ASK_AI_PATHS)) {
      const hrefs = ROLE_MENUS[workspace as keyof typeof ROLE_MENUS].flatMap((g) =>
        g.items.map((i) => i.href)
      )
      expect(hrefs).toContain(href)
    }
    expect(ROLE_MENUS.VIEWER[0]?.items.map((item) => item.href)).toEqual([
      '/viewer',
      '/viewer/dashboards',
    ])
  })
})
