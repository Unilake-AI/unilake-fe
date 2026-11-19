import { http } from '@/api/http'
import type { components } from '@/api/schema'
import type { RoleWorkspace } from '@/types/roles'

export type NotificationPage = components['schemas']['NotificationPage']
export type NotificationWorkspace = 'ADMIN' | 'DATA_ADMIN' | 'MANAGER' | 'STAFF'
export type Notification = components['schemas']['NotificationRead']

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

export const API_Notifications = async (params: {
  workspace: NotificationWorkspace
  unread_only: boolean
  limit: number
  offset: number
}) => (await http.get<components['schemas']['NotificationPage']>('/notifications', { params })).data

export const API_ReadNotifications = async (event_ids: number[]) => {
  await http.post('/notifications/read', { event_ids })
}

export function issueNotificationHref(workspace: NotificationWorkspace, issueId: string): string {
  const root =
    workspace === 'ADMIN'
      ? '/admin/quality-issues'
      : workspace === 'MANAGER'
        ? '/manager/quality-issues'
        : workspace === 'STAFF'
          ? '/staff/quality-issues'
          : '/data/quality'
  return `${root}/${encodeURIComponent(issueId)}`
}
