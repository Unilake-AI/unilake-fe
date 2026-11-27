import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { AppShell } from '@/components/layout/app-shell'
import { ROLE_PRIORITY, extractRolesFromToken, toRoleCode } from '@/config/roles'
import { ProfileView } from '@/views/shared/profile-view'

export const metadata = { title: 'Hồ sơ cá nhân | UniLake AI' }

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const token = (await cookies()).get('access_token')?.value
  const roles = token ? extractRolesFromToken(token) : []
  const requestedRole = toRoleCode((await searchParams).role)
  const role =
    requestedRole && roles.includes(requestedRole)
      ? requestedRole
      : ROLE_PRIORITY.find((item) => roles.includes(item))

  if (!role) redirect('/login')

  return (
    <AppShell role={role}>
      <ProfileView role={role} roles={roles} />
    </AppShell>
  )
}
