import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { StatCard } from '../components/StatCard'
import { AgentCard } from '../components/AgentCard'
import { StatusBadge } from '../components/StatusBadge'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorState } from '../components/ErrorState'
import { fetchOverview } from '../api/overview'
import { fetchAgents, fetchAgentMetrics, fetchAgentHealth } from '../api/agents'
import { fetchAlerts, type Alert } from '../api/alerts'
import { globalEventStream } from '../api/events'
import { ping } from '../api/client'
import type { OverviewResponse, Agent, SystemSnapshot } from '../types/api'

const AUTO_REFRESH_SECONDS = 15

export function Overview() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [snapshots, setSnapshots] = useState<Record<string, SystemSnapshot>>({})
  const [healthStatuses, setHealthStatuses] = useState<Record<string, string>>({})
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [backendOnline, setBackendOnline] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)

    try {
      const online = await ping()
      setBackendOnline(online)

      if (!online) {
        setError('Backend is unreachable. Make sure the backend server is running at the configured URL.')
        return
      }

      const [ov, agentList, alertsRes] = await Promise.all([
        fetchOverview(),
        fetchAgents(),
        fetchAlerts().catch(() => ({ alerts: [] })),
      ])
      setOverview(ov)
      setAgents(agentList.agents)
      setRecentAlerts(alertsRes.alerts.slice(0, 5))
      setError(null)

      // Fetch per-agent metrics + health in parallel (best-effort)
      const snapshotMap: Record<string, SystemSnapshot> = {}
      const healthMap: Record<string, string> = {}

      await Promise.allSettled(
        agentList.agents.map(async (a) => {
          try {
            const [metricsResp, healthResp] = await Promise.allSettled([
              fetchAgentMetrics(a.id),
              fetchAgentHealth(a.id),
            ])
            if (metricsResp.status === 'fulfilled') {
              snapshotMap[a.id] = (metricsResp.value.metrics?.system ?? {}) as SystemSnapshot
            }
            if (healthResp.status === 'fulfilled') {
              healthMap[a.id] = healthResp.value.status
            }
          } catch { /* skip failed agents */ }
        }),
      )
      setSnapshots(snapshotMap)
      setHealthStatuses(healthMap)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      load()
    })
    globalEventStream.connect()

    // Real-time SSE updates handling
    const unsub = globalEventStream.subscribe((event) => {
      if (event.type === 'telemetry.updated' && event.agent_id && event.metrics) {
        const sys = (event.metrics.system ?? {}) as SystemSnapshot
        setSnapshots((prev) => ({ ...prev, [event.agent_id!]: sys }))
      } else if (event.type === 'agent.registered' || event.type === 'agent.status_changed' || event.type === 'alert.firing' || event.type === 'alert.resolved') {
        load(true)
      }
    })

    timerRef.current = setInterval(() => load(true), AUTO_REFRESH_SECONDS * 1000)
    return () => {
      unsub()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [load])

  if (loading) return <LoadingSpinner />

  const lastTelemetry = overview?.latest_telemetry
    ? new Date(overview.latest_telemetry).toLocaleTimeString()
    : null

  const activeAlertsCount = recentAlerts.filter((a) => a.status === 'firing').length

  return (
    <>
      <Header
        title="Fleet Overview"
        subtitle={lastTelemetry ? `Last telemetry: ${lastTelemetry}` : 'No telemetry yet'}
        backendOnline={backendOnline}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        autoRefreshSeconds={AUTO_REFRESH_SECONDS}
      />

      <div className="page-content">
        {error && <ErrorState message={error} onRetry={() => load(true)} />}

        <div className="stat-grid">
          <StatCard label="Total Agents" value={overview?.total ?? 0} variant="accent" loading={!overview} />
          <StatCard label="Healthy" value={overview?.healthy ?? 0} variant="healthy" loading={!overview} />
          <StatCard label="Stale" value={overview?.stale ?? 0} variant="stale" loading={!overview} />
          <StatCard label="Offline" value={overview?.offline ?? 0} variant="offline" loading={!overview} />
          <StatCard label="Active Alerts" value={activeAlertsCount} variant={activeAlertsCount > 0 ? 'offline' : 'healthy'} />
        </div>

        {/* Compact Recent Alerts Section */}
        {recentAlerts.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div className="section-header">
              <div className="section-title">Recent Alerts</div>
              <button
                onClick={() => navigate('/alerts')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                View all ({recentAlerts.length}) →
              </button>
            </div>
            <div className="history-section" style={{ padding: '12px 16px' }}>
              <div className="history-list">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className="history-row" style={{ gridTemplateColumns: '140px 100px 1fr 100px' }}>
                    <span className="ts">{new Date(alert.started_at).toLocaleTimeString()}</span>
                    <span className="val">{alert.agent_id}</span>
                    <span className="val" style={{ color: alert.status === 'firing' ? 'var(--offline)' : 'var(--text-primary)' }}>
                      {alert.rule_name || alert.message}
                    </span>
                    <StatusBadge status={alert.status === 'firing' ? 'offline' : 'healthy'} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="section-header">
          <div className="section-title">Registered Agents</div>
        </div>

        {agents.length === 0 && !error ? (
          <div className="empty-state">
            <div className="empty-state-icon">🖥️</div>
            <div className="empty-state-title">No agents registered</div>
            <div className="empty-state-sub">
              Start the OpsNexus agent to see your infrastructure here.
            </div>
          </div>
        ) : (
          <div className="agent-grid">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                snapshot={snapshots[agent.id]}
                healthStatus={healthStatuses[agent.id]}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
