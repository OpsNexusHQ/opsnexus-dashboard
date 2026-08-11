import { MetricBar } from './MetricBar'

interface Props {
  title: string
  icon: string
  iconBg?: string
  children: React.ReactNode
}

function Card({ title, icon, iconBg, children }: Props) {
  return (
    <div className="metric-card fade-in">
      <div className="metric-card-header">
        <div
          className="metric-card-icon"
          style={{ background: iconBg ?? 'var(--accent-dim)', border: '1px solid var(--border-light)' }}
        >
          {icon}
        </div>
        <div className="metric-card-title">{title}</div>
      </div>
      {children}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-detail-row">
      <span className="metric-detail-label">{label}</span>
      <span className="metric-detail-value">{value}</span>
    </div>
  )
}

function fmtBytes(b: number): string {
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`
  if (b >= 1e3) return `${(b / 1e3).toFixed(1)} KB`
  return `${b} B`
}

// ─── Exported metric card variants ────────────────────────────────────────

interface CpuCardProps { usagePercent?: number }
export function CpuMetricCard({ usagePercent }: CpuCardProps) {
  return (
    <Card title="CPU" icon="⚡" iconBg="var(--cpu-dim)">
      <div className="metric-card-value-row">
        <span className="metric-card-big" style={{ color: 'var(--cpu-color)' }}>
          {usagePercent != null ? usagePercent.toFixed(1) : '—'}
        </span>
        <span className="metric-card-unit">%</span>
      </div>
      <MetricBar label="Usage" percent={usagePercent} color="var(--cpu-color)" />
    </Card>
  )
}

interface MemCardProps {
  usedPercent?: number
  total?: number
  used?: number
  available?: number
}
export function MemoryMetricCard({ usedPercent, total, used, available }: MemCardProps) {
  return (
    <Card title="Memory" icon="🧠" iconBg="var(--mem-dim)">
      <div className="metric-card-value-row">
        <span className="metric-card-big" style={{ color: 'var(--mem-color)' }}>
          {usedPercent != null ? usedPercent.toFixed(1) : '—'}
        </span>
        <span className="metric-card-unit">%</span>
      </div>
      <MetricBar label="Used" percent={usedPercent} color="var(--mem-color)" />
      <div className="metric-card-rows">
        {total != null && <DetailRow label="Total" value={fmtBytes(total)} />}
        {used != null && <DetailRow label="Used" value={fmtBytes(used)} />}
        {available != null && <DetailRow label="Available" value={fmtBytes(available)} />}
      </div>
    </Card>
  )
}

interface DiskCardProps {
  usedPercent?: number
  total?: number
  used?: number
  free?: number
}
export function DiskMetricCard({ usedPercent, total, used, free }: DiskCardProps) {
  return (
    <Card title="Disk" icon="💾" iconBg="var(--disk-dim)">
      <div className="metric-card-value-row">
        <span className="metric-card-big" style={{ color: 'var(--disk-color)' }}>
          {usedPercent != null ? usedPercent.toFixed(1) : '—'}
        </span>
        <span className="metric-card-unit">%</span>
      </div>
      <MetricBar label="Used" percent={usedPercent} color="var(--disk-color)" />
      <div className="metric-card-rows">
        {total != null && <DetailRow label="Total" value={fmtBytes(total)} />}
        {used != null && <DetailRow label="Used" value={fmtBytes(used)} />}
        {free != null && <DetailRow label="Free" value={fmtBytes(free)} />}
      </div>
    </Card>
  )
}

interface NetworkCardProps {
  interfaces?: Array<{ name: string; bytes_sent: number; bytes_recv: number }>
}
export function NetworkMetricCard({ interfaces }: NetworkCardProps) {
  const totalRecv = interfaces?.reduce((s, i) => s + i.bytes_recv, 0) ?? 0
  const totalSent = interfaces?.reduce((s, i) => s + i.bytes_sent, 0) ?? 0
  const ifaceCount = interfaces?.length ?? 0

  return (
    <Card title="Network" icon="🌐" iconBg="var(--net-dim)">
      <div className="metric-card-rows">
        <DetailRow label="Interfaces" value={ifaceCount} />
        <DetailRow label="Total Received" value={fmtBytes(totalRecv)} />
        <DetailRow label="Total Sent" value={fmtBytes(totalSent)} />
        {interfaces?.slice(0, 3).map((iface) => (
          <div key={iface.name} style={{ borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '2px' }}>
            <DetailRow label={iface.name} value={`↓ ${fmtBytes(iface.bytes_recv)} ↑ ${fmtBytes(iface.bytes_sent)}`} />
          </div>
        ))}
      </div>
    </Card>
  )
}

interface UptimeCardProps {
  uptimeSeconds?: number
  processCount?: number
}
export function SystemInfoCard({ uptimeSeconds, processCount }: UptimeCardProps) {
  function fmt(s: number): string {
    const d = Math.floor(s / 86400)
    const h = Math.floor((s % 86400) / 3600)
    const m = Math.floor((s % 3600) / 60)
    if (d > 0) return `${d}d ${h}h ${m}`
    if (h > 0) return `${h}h ${m}m`
    return `${m}m ${s % 60}s`
  }

  const uptimeLabel = uptimeSeconds != null ? fmt(uptimeSeconds) : '—'

  return (
    <Card title="System" icon="🖥️" iconBg="var(--accent-dim)">
      <div className="metric-card-rows">
        {uptimeSeconds != null && (
          <DetailRow label="Uptime" value={uptimeLabel} />
        )}
        {processCount != null && (
          <DetailRow label="Processes" value={processCount} />
        )}
      </div>
    </Card>
  )
}
