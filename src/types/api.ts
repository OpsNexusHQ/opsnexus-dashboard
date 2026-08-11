// ─── Agent ────────────────────────────────────────────────────────────────

export interface Agent {
  id: string
  name: string
  hostname: string
  os: string
  arch: string
  version: string
  status: string
  last_seen: string
  created_at: string
}

export interface AgentListResponse {
  agents: Agent[]
}

// ─── Health ───────────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'stale' | 'offline' | 'unknown'

export interface AgentHealth {
  agent_id: string
  status: HealthStatus
  last_seen?: string
  seconds_since_last_seen?: number
}

// ─── Metrics ──────────────────────────────────────────────────────────────

export interface CpuMetrics {
  usage_percent: number
}

export interface MemoryMetrics {
  total: number
  available: number
  used: number
  used_percent: number
}

export interface DiskMetrics {
  total?: number
  free?: number
  used?: number
  used_percent: number
  path?: string
  partitions?: Array<{
    path: string
    total: number
    free: number
    used: number
    used_percent: number
  }>
}

export interface NetworkInterface {
  name: string
  bytes_sent: number
  bytes_recv: number
  packets_sent: number
  packets_recv: number
}

export interface NetworkMetrics {
  interfaces: NetworkInterface[]
}

export interface UptimeMetrics {
  uptime_seconds: number
}

export interface ProcessMetrics {
  running_count: number
}

export interface SystemSnapshot {
  cpu?: CpuMetrics
  memory?: MemoryMetrics
  disk?: DiskMetrics
  network?: NetworkMetrics
  uptime?: UptimeMetrics
  processes?: ProcessMetrics
  timestamp?: string
}

export interface MetricsResponse {
  agent_id: string
  timestamp: string
  metrics: {
    system?: SystemSnapshot
    [key: string]: unknown
  }
}

// ─── Analytics ────────────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  timestamp: string
  cpu: number
  memory: number
  disk: number
  bytes_received: number
  bytes_sent: number
  running_processes: number
}

export interface AnalyticsResponse {
  agent_id: string
  range: string
  points: TimeSeriesPoint[]
}

// ─── Overview ─────────────────────────────────────────────────────────────

export interface OverviewResponse {
  total: number
  healthy: number
  stale: number
  offline: number
  latest_telemetry?: string
}

// ─── Telemetry History ────────────────────────────────────────────────────

export interface TelemetryRecord {
  timestamp: string
  metrics: {
    system?: SystemSnapshot
    [key: string]: unknown
  }
  created_at: string
}

export interface TelemetryHistoryResponse {
  agent_id: string
  telemetry: TelemetryRecord[]
}

// ─── API Error ────────────────────────────────────────────────────────────

export interface ApiError {
  error: {
    message: string
    code?: string
  } | string
}
