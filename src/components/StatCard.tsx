interface Props {
  label: string
  value: number | string | null | undefined
  sub?: string
  variant?: 'default' | 'healthy' | 'stale' | 'offline' | 'accent'
  loading?: boolean
}

export function StatCard({ label, value, sub, variant = 'default', loading }: Props) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      {loading ? (
        <div className="stat-card-value" style={{ fontSize: '18px', color: 'var(--text-muted)' }}>
          —
        </div>
      ) : (
        <div className={`stat-card-value ${variant !== 'default' ? variant : ''}`}>
          {value ?? '—'}
        </div>
      )}
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  )
}
