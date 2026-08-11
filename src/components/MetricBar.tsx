interface Props {
  label: string
  percent: number | null | undefined
  color?: string
}

function getColor(percent: number | null | undefined, override?: string): string {
  if (override) return override
  if (percent == null) return 'var(--text-muted)'
  if (percent >= 90) return 'var(--offline)'
  if (percent >= 70) return 'var(--stale)'
  return 'var(--accent)'
}

export function MetricBar({ label, percent, color }: Props) {
  const pct = percent ?? 0
  const clampedPct = Math.min(100, Math.max(0, pct))
  const fill = getColor(percent, color)

  return (
    <div className="metric-bar-row">
      <span className="metric-bar-label">{label}</span>
      <div className="metric-bar-track">
        <div
          className="metric-bar-fill"
          style={{ width: `${clampedPct}%`, background: fill }}
        />
      </div>
      <span className="metric-bar-value" style={{ color: fill }}>
        {percent != null ? `${pct.toFixed(1)}%` : '—'}
      </span>
    </div>
  )
}
