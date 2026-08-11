import type { HealthStatus } from '../types/api'

interface Props {
  status: HealthStatus | string
  size?: 'sm' | 'md'
}

const LABEL_MAP: Record<string, string> = {
  healthy: 'Healthy',
  stale: 'Stale',
  offline: 'Offline',
  online: 'Online',
  unknown: 'Unknown',
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const cls = status.toLowerCase()
  const label = LABEL_MAP[cls] ?? status
  return (
    <span
      className={`status-badge ${cls}`}
      style={size === 'sm' ? { fontSize: '10px', padding: '1px 6px' } : undefined}
    >
      {label}
    </span>
  )
}
