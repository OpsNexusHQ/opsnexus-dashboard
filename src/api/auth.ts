import { apiFetch } from './client'

export interface ApiToken {
  id: string
  name: string
  raw_token?: string
  role: 'viewer' | 'operator' | 'admin'
  enabled: boolean
  created_at: string
  last_used_at?: string
  expires_at?: string
}

export function fetchApiTokens(): Promise<{ tokens: ApiToken[] }> {
  return apiFetch<{ tokens: ApiToken[] }>('/api/v1/tokens')
}

export function createApiToken(name: string, role: 'viewer' | 'operator' | 'admin'): Promise<ApiToken> {
  return apiFetch<ApiToken>('/api/v1/tokens', {
    method: 'POST',
    body: JSON.stringify({ name, role }),
  })
}

export function deleteApiToken(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/tokens/${id}`, {
    method: 'DELETE',
  })
}
