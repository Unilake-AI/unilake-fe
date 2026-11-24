import { DomainOwners } from '@/components/page/domain-owners'
import { ProfilesView } from '@/views/data/profiles-view'

export const metadata = { title: 'Cấu hình Silver (Profiles) | UniLake AI' }

export default function ProfilesPage() {
  return (
    <div className="space-y-5">
      <ProfilesView />
      <DomainOwners />
    </div>
  )
}
