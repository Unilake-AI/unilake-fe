import { http } from '@/api/http'
import type { components } from '@/api/schema'

export type NotificationWorkspace = 'ADMIN' | 'DATA_ADMIN' | 'MANAGER' | 'STAFF'
export type Notification = components['schemas']['NotificationRead']

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
