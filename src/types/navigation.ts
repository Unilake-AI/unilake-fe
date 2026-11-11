export interface MenuItem {
  title: string
  href: string
  iconName: string
  badge?: string
  description?: string
}

export interface MenuGroup {
  groupTitle?: string
  items: MenuItem[]
}
