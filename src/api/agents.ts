import { apiFetch } from './client'
import type {
  Agent,
  AgentListResponse,
  AgentHealth,
  MetricsResponse,
  TelemetryHistoryResponse,
  AnalyticsResponse,
} from '../types/api'

export function fetchAgents(): Promise<AgentListResponse> {
  return apiFetch<AgentListResponse>('/api/v1/agents')
}

export function fetchAgent(id: string, options?: RequestInit): Promise<Agent> {
  return apiFetch<Agent>(`/api/v1/agents/${id}`, options)
}

export function fetchAgentHealth(id: string, options?: RequestInit): Promise<AgentHealth> {
  return apiFetch<AgentHealth>(`/api/v1/agents/${id}/health`, options)
}

export function fetchAgentMetrics(id: string, options?: RequestInit): Promise<MetricsResponse> {
  return apiFetch<MetricsResponse>(`/api/v1/agents/${id}/metrics`, options)
}

export function fetchAgentMetricsHistory(
  id: string,
  limit = 20,
  options?: RequestInit,
): Promise<MetricsResponse[]> {
  return apiFetch<MetricsResponse[]>(
    `/api/v1/agents/${id}/metrics/history?limit=${limit}`,
    options,
  )
}

export function fetchAgentTelemetryLatest(id: string): Promise<MetricsResponse> {
  return apiFetch<MetricsResponse>(`/api/v1/agents/${id}/telemetry/latest`)
}

export function fetchAgentTelemetryHistory(
  id: string,
  limit = 20,
): Promise<TelemetryHistoryResponse> {
  return apiFetch<TelemetryHistoryResponse>(
    `/api/v1/agents/${id}/telemetry?limit=${limit}`,
  )
}

export function fetchAgentAnalytics(
  id: string,
  range = '1h',
  options?: RequestInit,
): Promise<AnalyticsResponse> {
  return apiFetch<AnalyticsResponse>(`/api/v1/agents/${id}/analytics?range=${range}`, options)
}
