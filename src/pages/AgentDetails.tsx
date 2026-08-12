import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { StatusBadge } from '../components/StatusBadge'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorState } from '../components/ErrorState'
import { TimeSeriesChart } from '../components/TimeSeriesChart'
import {
  CpuMetricCard,
  MemoryMetricCard,
  DiskMetricCard,
  NetworkMetricCard,
  SystemInfoCard,
} from '../components/MetricCard'
import {
  fetchAgent,
  fetchAgentHealth,
  fetchAgentMetrics,
  fetchAgentMetricsHistory,
  fetchAgentAnalytics,
} from '../api/agents'
import { globalEventStream } from '../api/events'
import { ping } from '../api/client'
import type {
  Agent,
  AgentHealth,
  SystemSnapshot,
  MetricsResponse,
  TimeSeriesPoint,
} from '../types/api'

const AUTO_REFRESH_SECONDS = 15

function fmtTs(ts: string): string {
  return new Date(ts).toLocaleString()
}

/**
 * Normalize disk metrics coming from different backend/agent schemas.
 *
 * Supported forms:
 *
 * disk: {
 *   total,
 *   used,
 *   free,
 *   used_percent
 * }
 *
 * OR:
 *
 * disk: {
 *   partitions: [
 *     {
 *       path / mountpoint,
 *       total / total_bytes,
 *       used / used_bytes,
 *       free / free_bytes,
 *       used_percent
 *     }
 *   ]
 * }
 */
function normalizeDisk(system: SystemSnapshot): SystemSnapshot {
  const disk = system.disk

  if (!disk) {
    return system
  }

  const partitions = disk.partitions ?? []

  if (partitions.length === 0) {
    return system
  }

  const root =
    partitions.find(
      (partition) =>
        partition.path === '/' ||
        partition.mountpoint === '/',
    ) ?? partitions[0]

  if (!root) {
    return system
  }

  const rootTotal =
    root.total ??
    root.total_bytes

  const rootUsed =
    root.used ??
    root.used_bytes

  const rootFree =
    root.free ??
    root.free_bytes

  const rootUsedPercent =
    root.used_percent ??
    (rootTotal != null && rootUsed != null && rootTotal > 0
      ? (rootUsed / rootTotal) * 100
      : undefined)

  return {
    ...system,
    disk: {
      ...disk,
      total: disk.total ?? rootTotal,
      used: disk.used ?? rootUsed,
      free: disk.free ?? rootFree,
      used_percent:
        disk.used_percent ??
        rootUsedPercent ??
        0,
    },
  }
}

function extractSystem(mr: MetricsResponse): SystemSnapshot {
  const system = (mr.metrics?.system ?? {}) as SystemSnapshot

  return normalizeDisk(system)
}

function normalizeLiveSystem(
  system: SystemSnapshot,
): SystemSnapshot {
  return normalizeDisk(system)
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

export function AgentDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [agent, setAgent] = useState<Agent | null>(null)
  const [health, setHealth] = useState<AgentHealth | null>(null)
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null)
  const [history, setHistory] = useState<MetricsResponse[]>([])
  const [analyticsPoints, setAnalyticsPoints] = useState<TimeSeriesPoint[]>([])
  const [selectedRange, setSelectedRange] = useState<string>('1h')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [backendOnline, setBackendOnline] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const loadControllerRef = useRef<AbortController | null>(null)
  const analyticsControllerRef = useRef<AbortController | null>(null)

  const loadRequestIdRef = useRef(0)
  const analyticsRequestIdRef = useRef(0)
  const selectedRangeRef = useRef(selectedRange)

  useEffect(() => {
    selectedRangeRef.current = selectedRange
  }, [selectedRange])

  const loadAnalytics = useCallback(
    async (rangeStr: string) => {
      if (!id) return

      analyticsControllerRef.current?.abort()

      const controller = new AbortController()
      analyticsControllerRef.current = controller

      const requestId = ++analyticsRequestIdRef.current

      try {
        const analyticsRes = await fetchAgentAnalytics(
          id,
          rangeStr,
          { signal: controller.signal },
        )

        if (
          controller.signal.aborted ||
          requestId !== analyticsRequestIdRef.current
        ) {
          return
        }

        setAnalyticsPoints(analyticsRes.points)
      } catch (error) {
        if (
          controller.signal.aborted ||
          isAbortError(error) ||
          requestId !== analyticsRequestIdRef.current
        ) {
          return
        }
      }
    },
    [id],
  )

  const load = useCallback(
    async (isRefresh = false) => {
      if (!id) return

      loadControllerRef.current?.abort()

      const controller = new AbortController()
      loadControllerRef.current = controller

      const requestId = ++loadRequestIdRef.current

      if (isRefresh) {
        setRefreshing(true)
      }

      try {
        const online = await ping({
          signal: controller.signal,
        })

        if (
          controller.signal.aborted ||
          requestId !== loadRequestIdRef.current
        ) {
          return
        }

        setBackendOnline(online)

        if (!online) {
          setError('Backend is unreachable.')
          return
        }

        const [
          agentRes,
          healthRes,
          metricsRes,
          historyRes,
        ] = await Promise.allSettled([
          fetchAgent(id, {
            signal: controller.signal,
          }),

          fetchAgentHealth(id, {
            signal: controller.signal,
          }),

          fetchAgentMetrics(id, {
            signal: controller.signal,
          }),

          fetchAgentMetricsHistory(id, 20, {
            signal: controller.signal,
          }),
        ])

        if (
          controller.signal.aborted ||
          requestId !== loadRequestIdRef.current
        ) {
          return
        }

        if (agentRes.status === 'fulfilled') {
          setAgent(agentRes.value)
        } else {
          throw new Error(`Agent not found: ${id}`)
        }

        if (healthRes.status === 'fulfilled') {
          setHealth(healthRes.value)
        }

        if (metricsRes.status === 'fulfilled') {
          const normalizedSystem = extractSystem(
            metricsRes.value,
          )

          setSnapshot(normalizedSystem)
        }

        if (historyRes.status === 'fulfilled') {
          setHistory(historyRes.value)
        }

        await loadAnalytics(selectedRangeRef.current)

        setError(null)
      } catch (error) {
        if (
          controller.signal.aborted ||
          isAbortError(error) ||
          requestId !== loadRequestIdRef.current
        ) {
          return
        }

        setError(
          error instanceof Error
            ? error.message
            : 'Unexpected error',
        )
      } finally {
        if (
          !controller.signal.aborted &&
          requestId === loadRequestIdRef.current
        ) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [id, loadAnalytics],
  )

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void load()
    }, 0)

    globalEventStream.connect()

    const unsub = globalEventStream.subscribe((event) => {
      if (
        event.agent_id === id &&
        event.type === 'telemetry.updated' &&
        event.metrics
      ) {
        const system = (event.metrics.system ?? {}) as SystemSnapshot

        /**
         * IMPORTANT:
         * Normalize SSE/live telemetry too.
         * Previously live telemetry directly called setSnapshot(),
         * which could leave disk data only inside partitions.
         */
        const normalizedSystem =
          normalizeLiveSystem(system)

        setSnapshot(normalizedSystem)

        void loadAnalytics(
          selectedRangeRef.current,
        )
      }
    })

    timerRef.current = setInterval(() => {
      void load(true)
    }, AUTO_REFRESH_SECONDS * 1000)

    return () => {
      window.clearTimeout(initialLoadTimer)

      unsub()

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      loadControllerRef.current?.abort()
      analyticsControllerRef.current?.abort()
    }
  }, [id, load, loadAnalytics])

  const handleRangeChange = (range: string) => {
    setSelectedRange(range)
    selectedRangeRef.current = range

    void loadAnalytics(range)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  const agentName = agent?.name ?? id ?? 'Agent'
  const status =
    health?.status ??
    agent?.status ??
    'unknown'

  /*
   * Disk values are already normalized here.
   *
   * That means the card does NOT need to know whether the
   * backend sent:
   *
   *   disk.total
   *
   * or:
   *
   *   disk.partitions[0].total_bytes
   *
   * The dashboard has one consistent representation.
   */
  const disk = snapshot?.disk

  return (
    <>
      <Header
        title={agentName}
        subtitle={`Agent ID: ${id}`}
        backendOnline={backendOnline}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        autoRefreshSeconds={AUTO_REFRESH_SECONDS}
      />

      <div className="page-content">

        <div
          className="detail-back"
          onClick={() => navigate('/agents')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              navigate('/agents')
            }
          }}
        >
          ← Back to Agents
        </div>

        {error && (
          <ErrorState
            message={error}
            onRetry={() => load(true)}
          />
        )}

        {agent && (
          <div className="detail-hero">

            <div className="detail-hero-icon">
              🖥️
            </div>

            <div className="detail-hero-info">

              <div className="detail-hero-name">
                {agent.name}
              </div>

              <div className="detail-hero-meta">

                <span className="detail-hero-chip">
                  <strong>ID</strong>{' '}
                  {agent.id}
                </span>

                <span className="detail-hero-chip">
                  <strong>Host</strong>{' '}
                  {agent.hostname}
                </span>

                <span className="detail-hero-chip">
                  <strong>OS</strong>{' '}
                  {agent.os}/{agent.arch}
                </span>

                <span className="detail-hero-chip">
                  <strong>Version</strong>{' '}
                  v{agent.version}
                </span>

                {health?.last_seen && (
                  <span className="detail-hero-chip">
                    <strong>Last Seen</strong>{' '}
                    {fmtTs(health.last_seen)}
                  </span>
                )}

              </div>
            </div>

            <div style={{ flexShrink: 0 }}>
              <StatusBadge status={status} />
            </div>

          </div>
        )}

        <div className="section-header">

          <div className="section-title">
            Live Metrics
          </div>

          {snapshot == null && !error && (
            <span
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
              }}
            >
              No telemetry available yet
            </span>
          )}

        </div>

        <div className="metrics-grid">

          <CpuMetricCard
            usagePercent={
              snapshot?.cpu?.usage_percent
            }
          />

          <MemoryMetricCard
            usedPercent={
              snapshot?.memory?.used_percent
            }
            total={
              snapshot?.memory?.total
            }
            used={
              snapshot?.memory?.used
            }
            available={
              snapshot?.memory?.available
            }
          />

          <DiskMetricCard
            usedPercent={
              disk?.used_percent
            }
            total={
              disk?.total
            }
            used={
              disk?.used
            }
            free={
              disk?.free
            }
          />

          <NetworkMetricCard
            interfaces={
              snapshot?.network?.interfaces
            }
          />

          <SystemInfoCard
            uptimeSeconds={
              snapshot?.uptime?.uptime_seconds
            }
            processCount={
              snapshot?.processes?.running_count
            }
          />

        </div>

        {/* Time-Series Analytics */}

        <div
          className="section-header"
          style={{ marginTop: '8px' }}
        >
          <div className="section-title">
            Historical Time-Series Analytics
          </div>
        </div>

        <TimeSeriesChart
          points={analyticsPoints}
          selectedRange={selectedRange}
          onRangeChange={handleRangeChange}
        />

        {/* History */}

        <div
          className="section-header"
          style={{ marginTop: '20px' }}
        >
          <div className="section-title">
            Metrics History
          </div>

          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
            }}
          >
            Last {history.length} records
          </span>
        </div>

        <div className="history-section">

          {history.length === 0 ? (
            <div
              className="empty-state"
              style={{ padding: '28px' }}
            >
              <div className="empty-state-icon">
                📊
              </div>

              <div className="empty-state-title">
                No history yet
              </div>
            </div>
          ) : (
            <div className="history-list">

              <div className="history-row header-row">
                <span>Timestamp</span>
                <span>CPU %</span>
                <span>Mem %</span>
                <span>Disk %</span>
                <span>Processes</span>
              </div>

              {history.map((record, index) => {
                const system =
                  extractSystem(record)

                return (
                  <div
                    key={`${record.timestamp}-${index}`}
                    className="history-row"
                  >

                    <span className="ts">
                      {fmtTs(record.timestamp)}
                    </span>

                    <span className="val">
                      {system.cpu?.usage_percent != null
                        ? `${system.cpu.usage_percent.toFixed(1)}%`
                        : '—'}
                    </span>

                    <span className="val">
                      {system.memory?.used_percent != null
                        ? `${system.memory.used_percent.toFixed(1)}%`
                        : '—'}
                    </span>

                    <span className="val">
                      {system.disk?.used_percent != null
                        ? `${system.disk.used_percent.toFixed(1)}%`
                        : '—'}
                    </span>

                    <span className="val">
                      {system.processes?.running_count ?? '—'}
                    </span>

                  </div>
                )
              })}

            </div>
          )}

        </div>

      </div>
    </>
  )
}