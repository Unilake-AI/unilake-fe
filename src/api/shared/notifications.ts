import { http } from '@/api/http'
import type { components } from '@/api/schema'
import type { RoleWorkspace } from '@/types/roles'

export type NotificationPage = components['schemas']['NotificationPage']

export async function API_ListNotifications(
  workspace: Exclude<RoleWorkspace, 'VIEWER'>,
  offset: number
): Promise<NotificationPage> {
  const { data } = await http.get<NotificationPage>('/notifications', {
    params: { workspace, offset, limit: 20 },
  })
  return data
}

export async function API_MarkNotificationsRead(eventIds: number[]): Promise<void> {
  await http.post('/notifications/read', { event_ids: eventIds })
}

export async function API_MarkStaffNotificationRead(notificationId: number): Promise<void> {
  await http.post(`/notifications/${notificationId}/read`)
}
