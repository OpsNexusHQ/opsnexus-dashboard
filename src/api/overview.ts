import { apiFetch } from './client'
import type { OverviewResponse } from '../types/api'

export function fetchOverview(): Promise<OverviewResponse> {
  return apiFetch<OverviewResponse>('/api/v1/overview')
}
