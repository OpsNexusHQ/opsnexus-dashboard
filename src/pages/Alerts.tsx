import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { StatusBadge } from '../components/StatusBadge'
import { StatCard } from '../components/StatCard'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorState } from '../components/ErrorState'
import { AlertDetailDrawer } from '../components/AlertDetailDrawer'
import { fetchAlerts, type Alert } from '../api/alerts'
import { globalEventStream } from '../api/events'
import { ping } from '../api/client'

export function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [filter, setFilter] = useState<'all' | 'firing' | 'acknowledged' | 'resolved'>('all')
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
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
        setError('Backend is unreachable.')
        return
      }

      const res = await fetchAlerts()
      setAlerts(res.alerts)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load alerts')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      load()
    })

    const unsub = globalEventStream.subscribe((event) => {
      if (
        event.type === 'alert.firing' ||
        event.type === 'alert.acknowledged' ||
        event.type === 'alert.resolved' ||
        event.type === 'alert.comment_added'
      ) {
        load(true)
      }
    })

    timerRef.current = setInterval(() => load(true), 20000)
    return () => {
      unsub()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [load])

  if (loading) return <LoadingSpinner />

  const firingCount = alerts.filter((a) => a.status === 'firing').length
  const ackCount = alerts.filter((a) => a.status === 'acknowledged').length
  const resolvedCount = alerts.filter((a) => a.status === 'resolved').length

  const filteredAlerts = filter === 'all'
    ? alerts
    : alerts.filter((a) => a.status === filter)

  const fmtTs = (ts?: string) => (ts ? new Date(ts).toLocaleString() : '—')

  return (
    <>
      <Header
        title="Alerts & Incident Workflow"
        subtitle={`${firingCount} firing, ${ackCount} acknowledged`}
        backendOnline={backendOnline}
        onRefresh={() => load(true)}
        refreshing={refreshing}
      />

      <div className="page-content">
        {error && <ErrorState message={error} onRetry={() => load(true)} />}

        <div className="stat-grid">
          <StatCard label="Total Alerts" value={alerts.length} variant="accent" />
          <StatCard label="Active Firing" value={firingCount} variant="offline" />
          <StatCard label="Acknowledged" value={ackCount} variant="stale" />
          <StatCard label="Resolved" value={resolvedCount} variant="healthy" />
        </div>

        {/* Filter strip */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {(['all', 'firing', 'acknowledged', 'resolved'] as const).map((f) => (
            <button
              key={f}
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
              }}
            >
              {f === 'all' ? `All (${alerts.length})` : `${f} (${alerts.filter((a) => a.status === f).length})`}
            </button>
          ))}
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <div className="empty-state-title">No {filter !== 'all' ? filter : ''} alerts</div>
            <div className="empty-state-sub">Infrastructure is operating within normal parameters.</div>
          </div>
        ) : (
          <div className="history-section">
            <div className="history-list">
              <div className="history-row header-row" style={{ gridTemplateColumns: '100px 90px 140px 1fr 140px 100px' }}>
                <span>Status</span>
                <span>Severity</span>
                <span>Agent</span>
                <span>Alert Rule</span>
                <span>Started</span>
                <span>Action</span>
              </div>
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="history-row"
                  style={{ gridTemplateColumns: '100px 90px 140px 1fr 140px 100px', cursor: 'pointer' }}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <StatusBadge status={alert.status === 'firing' ? 'offline' : alert.status === 'acknowledged' ? 'stale' : 'healthy'} size="sm" />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: alert.severity === 'critical' ? 'var(--offline)' : 'var(--stale)' }}>
                    {(alert.severity || 'warning').toUpperCase()}
                  </span>
                  <span className="ts">{alert.agent_id}</span>
                  <span className="val">{alert.rule_name || alert.message}</span>
                  <span className="ts">{fmtTs(alert.started_at)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedAlert(alert)
                    }}
                    style={{
                      padding: '3px 8px',
                      background: 'var(--accent-dim)',
                      border: '1px solid var(--accent)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--accent)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AlertDetailDrawer
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onAlertUpdated={() => load(true)}
      />
    </>
  )
}
