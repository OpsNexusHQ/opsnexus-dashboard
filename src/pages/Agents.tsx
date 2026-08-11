import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { AgentCard } from '../components/AgentCard'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorState } from '../components/ErrorState'
import { fetchAgents, fetchAgentMetrics, fetchAgentHealth } from '../api/agents'
import { ping } from '../api/client'
import type { Agent, SystemSnapshot } from '../types/api'

const AUTO_REFRESH_SECONDS = 20

export function Agents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [snapshots, setSnapshots] = useState<Record<string, SystemSnapshot>>({})
  const [healthStatuses, setHealthStatuses] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [backendOnline, setBackendOnline] = useState(false)
  const [filter, setFilter] = useState<'all' | 'healthy' | 'stale' | 'offline'>('all')

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const online = await ping()
      setBackendOnline(online)

      if (!online) {
        setError('Backend is unreachable.')
        return
      }

      const { agents: list } = await fetchAgents()
      setAgents(list)
      setError(null)

      const snapshotMap: Record<string, SystemSnapshot> = {}
      const healthMap: Record<string, string> = {}

      await Promise.allSettled(
        list.map(async (a) => {
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
          } catch { /* skip */ }
        }),
      )
      setSnapshots(snapshotMap)
      setHealthStatuses(healthMap)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      load()
    })
    timerRef.current = setInterval(() => load(true), AUTO_REFRESH_SECONDS * 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [load])

  if (loading) return <LoadingSpinner />

  const filtered = filter === 'all'
    ? agents
    : agents.filter((a) => (healthStatuses[a.id] ?? a.status) === filter)

  const FILTERS = ['all', 'healthy', 'stale', 'offline'] as const

  return (
    <>
      <Header
        title="Agents"
        subtitle={`${agents.length} agent${agents.length !== 1 ? 's' : ''} registered`}
        backendOnline={backendOnline}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        autoRefreshSeconds={AUTO_REFRESH_SECONDS}
      />

      <div className="page-content">
        {error && <ErrorState message={error} onRetry={() => load(true)} />}

        {/* Filter strip */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              id={`filter-${f}`}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 14px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`,
                background: filter === f ? 'var(--accent-dim)' : 'var(--bg-card)',
                color: filter === f ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textTransform: 'capitalize',
                transition: 'all var(--transition)',
              }}
            >
              {f === 'all' ? `All (${agents.length})` : (
                `${f.charAt(0).toUpperCase() + f.slice(1)} (${
                  agents.filter((a) => (healthStatuses[a.id] ?? a.status) === f).length
                })`
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">No agents match this filter</div>
          </div>
        ) : (
          <div className="agent-grid">
            {filtered.map((agent) => (
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
