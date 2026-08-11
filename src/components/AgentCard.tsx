import { useNavigate } from 'react-router-dom'
import type { Agent } from '../types/api'
import type { SystemSnapshot } from '../types/api'
import { StatusBadge } from './StatusBadge'
import { MetricBar } from './MetricBar'

interface Props {
  agent: Agent
  snapshot?: SystemSnapshot
  healthStatus?: string
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function AgentCard({ agent, snapshot, healthStatus }: Props) {
  const navigate = useNavigate()

  const cpu = snapshot?.cpu?.usage_percent
  const mem = snapshot?.memory?.used_percent
  const disk = snapshot?.disk?.used_percent

  const status = (healthStatus ?? agent.status) as string

  return (
    <div
      className="agent-card fade-in"
      id={`agent-card-${agent.id}`}
      onClick={() => navigate(`/agents/${agent.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/agents/${agent.id}`)}
    >
      <div className="agent-card-top">
        <div className="agent-card-icon">🖥️</div>
        <div className="agent-card-name">
          <div className="agent-card-title">{agent.name}</div>
          <div className="agent-card-hostname">{agent.hostname}</div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="agent-card-meta">
        <div className="agent-meta-item">
          <div className="agent-meta-label">OS</div>
          <div className="agent-meta-value">{agent.os}/{agent.arch}</div>
        </div>
        <div className="agent-meta-item">
          <div className="agent-meta-label">Version</div>
          <div className="agent-meta-value">v{agent.version}</div>
        </div>
        {snapshot?.uptime?.uptime_seconds != null && (
          <div className="agent-meta-item">
            <div className="agent-meta-label">Uptime</div>
            <div className="agent-meta-value">
              {formatUptime(snapshot.uptime.uptime_seconds)}
            </div>
          </div>
        )}
        {snapshot?.processes?.running_count != null && (
          <div className="agent-meta-item">
            <div className="agent-meta-label">Processes</div>
            <div className="agent-meta-value">{snapshot.processes.running_count}</div>
          </div>
        )}
      </div>

      {(cpu != null || mem != null || disk != null) && (
        <div className="agent-card-metrics">
          {cpu != null && (
            <MetricBar label="CPU" percent={cpu} color="var(--cpu-color)" />
          )}
          {mem != null && (
            <MetricBar label="Mem" percent={mem} color="var(--mem-color)" />
          )}
          {disk != null && (
            <MetricBar label="Disk" percent={disk} color="var(--disk-color)" />
          )}
        </div>
      )}
    </div>
  )
}
