import { apiFetch } from './client'

export interface AlertRule {
  id: string
  name: string
  metric: string
  operator: string
  threshold: number
  duration_seconds: number
  for_duration_seconds: number
  cooldown_seconds: number
  severity: 'info' | 'warning' | 'critical'
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface Alert {
  id: string
  rule_id: string
  agent_id: string
  rule_name?: string
  severity?: 'info' | 'warning' | 'critical'
  status: 'firing' | 'acknowledged' | 'resolved'
  started_at: string
  acknowledged_at?: string
  acknowledged_by?: string
  acknowledged_comment?: string
  resolved_at?: string
  last_value: number
  message: string
  created_at: string
  updated_at: string
}

export interface AlertComment {
  id: string
  alert_id: string
  author_id: string
  comment: string
  created_at: string
}

export interface AlertsResponse {
  alerts: Alert[]
}

export interface AlertRulesResponse {
  rules: AlertRule[]
}

export function fetchAlerts(status?: string, agentId?: string): Promise<AlertsResponse> {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (agentId) params.append('agent_id', agentId)

  const query = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<AlertsResponse>(`/api/v1/alerts${query}`)
}

export function fetchAlert(id: string): Promise<Alert> {
  return apiFetch<Alert>(`/api/v1/alerts/${id}`)
}

export function acknowledgeAlert(id: string, comment = ''): Promise<Alert> {
  return apiFetch<Alert>(`/api/v1/alerts/${id}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({ comment, user: 'operator' }),
  })
}

export function fetchAlertComments(id: string): Promise<{ comments: AlertComment[] }> {
  return apiFetch<{ comments: AlertComment[] }>(`/api/v1/alerts/${id}/comments`)
}

export function addAlertComment(id: string, comment: string): Promise<AlertComment> {
  return apiFetch<AlertComment>(`/api/v1/alerts/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ comment, author_id: 'operator' }),
  })
}

export function fetchAlertRules(): Promise<AlertRulesResponse> {
  return apiFetch<AlertRulesResponse>('/api/v1/alert-rules')
}

export function createAlertRule(rule: Partial<AlertRule>): Promise<AlertRule> {
  return apiFetch<AlertRule>('/api/v1/alert-rules', {
    method: 'POST',
    body: JSON.stringify(rule),
  })
}

export function updateAlertRule(id: string, rule: Partial<AlertRule>): Promise<AlertRule> {
  return apiFetch<AlertRule>(`/api/v1/alert-rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(rule),
  })
}

export function deleteAlertRule(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/alert-rules/${id}`, {
    method: 'DELETE',
  })
}
