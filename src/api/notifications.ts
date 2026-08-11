import { apiFetch } from './client'

export interface NotificationChannel {
  id: string
  name: string
  type: 'webhook' | 'slack_webhook'
  url: string
  secret?: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface NotificationDelivery {
  id: string
  channel_id: string
  alert_id: string
  event_type: string
  status: 'pending' | 'delivered' | 'failed'
  attempts: number
  response_status: number
  error_message: string
  created_at: string
  sent_at?: string
}

export function fetchNotificationChannels(): Promise<{ channels: NotificationChannel[] }> {
  return apiFetch<{ channels: NotificationChannel[] }>('/api/v1/notification-channels')
}

export function createNotificationChannel(ch: Partial<NotificationChannel>): Promise<NotificationChannel> {
  return apiFetch<NotificationChannel>('/api/v1/notification-channels', {
    method: 'POST',
    body: JSON.stringify(ch),
  })
}

export function deleteNotificationChannel(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/notification-channels/${id}`, {
    method: 'DELETE',
  })
}

export function testNotificationChannel(id: string): Promise<{ status: string; response_status: number; error?: string }> {
  return apiFetch<{ status: string; response_status: number; error?: string }>(`/api/v1/notification-channels/${id}/test`, {
    method: 'POST',
  })
}

export function fetchNotificationDeliveries(): Promise<{ deliveries: NotificationDelivery[] }> {
  return apiFetch<{ deliveries: NotificationDelivery[] }>('/api/v1/notification-deliveries')
}
