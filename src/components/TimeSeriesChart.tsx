import { useState } from 'react'
import type { TimeSeriesPoint } from '../types/api'

interface Props {
  points: TimeSeriesPoint[]
  selectedRange: string
  onRangeChange: (range: string) => void
}

const RANGES = ['15m', '1h', '6h', '24h', '7d']

export function TimeSeriesChart({ points, selectedRange, onRangeChange }: Props) {
  const [activeMetric, setActiveMetric] = useState<'cpu' | 'memory' | 'disk' | 'network' | 'processes'>('cpu')
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const width = 800
  const height = 240
  const padding = { top: 20, right: 30, bottom: 35, left: 45 }

  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  // Extract metric data series
  const getVal = (pt: TimeSeriesPoint): number => {
    switch (activeMetric) {
      case 'cpu':
        return pt.cpu
      case 'memory':
        return pt.memory
      case 'disk':
        return pt.disk
      case 'network':
        return (pt.bytes_received + pt.bytes_sent) / 1024 // KB
      case 'processes':
        return pt.running_processes
      default:
        return 0
    }
  }

  const getMetricColor = (): string => {
    switch (activeMetric) {
      case 'cpu':
        return 'var(--cpu-color)'
      case 'memory':
        return 'var(--mem-color)'
      case 'disk':
        return 'var(--disk-color)'
      case 'network':
        return 'var(--net-color)'
      case 'processes':
        return 'var(--healthy)'
    }
  }

  const color = getMetricColor()

  const values = points.map(getVal)
  const maxVal = values.length > 0 ? Math.max(...values, 10) * 1.1 : 100
  const minVal = 0

  // Generate SVG path coordinates
  const coords = points.map((pt, i) => {
    const x = padding.left + (i / Math.max(points.length - 1, 1)) * chartW
    const y = padding.top + chartH - ((getVal(pt) - minVal) / (maxVal - minVal)) * chartH
    return { x, y, pt, val: getVal(pt) }
  })

  const linePath = coords.reduce(
    (acc, curr, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`,
    '',
  )

  const areaPath = coords.length > 0
    ? `${linePath} L ${coords[coords.length - 1].x} ${height - padding.bottom} L ${coords[0].x} ${height - padding.bottom} Z`
    : ''

  const formatYLabel = (val: number) => {
    if (activeMetric === 'network') return `${val.toFixed(0)} KB`
    if (activeMetric === 'processes') return `${val.toFixed(0)}`
    return `${val.toFixed(0)}%`
  }

  const formatXTime = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="metric-card fade-in" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['cpu', 'memory', 'disk', 'network', 'processes'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setActiveMetric(m)}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${activeMetric === m ? color : 'var(--border)'}`,
                background: activeMetric === m ? 'var(--bg-surface)' : 'transparent',
                color: activeMetric === m ? color : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'uppercase',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              style={{
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${selectedRange === r ? 'var(--accent)' : 'var(--border)'}`,
                background: selectedRange === r ? 'var(--accent-dim)' : 'transparent',
                color: selectedRange === r ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {points.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px' }}>
          <div className="empty-state-icon">📈</div>
          <div className="empty-state-title">No time-series data for range {selectedRange}</div>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
            <defs>
              <linearGradient id={`grad-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = padding.top + chartH * (1 - pct)
              const val = minVal + (maxVal - minVal) * pct
              return (
                <g key={pct}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 4}
                    fill="var(--text-muted)"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {formatYLabel(val)}
                  </text>
                </g>
              )
            })}

            {/* Area & Line */}
            {areaPath && <path d={areaPath} fill={`url(#grad-${activeMetric})`} />}
            {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />}

            {/* Hover Points & Vertical Indicator Line */}
            {coords.map((pt, i) => (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoverIndex === i ? 5 : 3}
                  fill={color}
                  stroke="var(--bg-card)"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              </g>
            ))}

            {/* Hover Tooltip Line */}
            {hoverIndex !== null && coords[hoverIndex] && (
              <line
                x1={coords[hoverIndex].x}
                y1={padding.top}
                x2={coords[hoverIndex].x}
                y2={height - padding.bottom}
                stroke="var(--accent)"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
            )}

            {/* Time Axis Labels */}
            {coords.filter((_, idx) => idx % Math.max(1, Math.floor(coords.length / 5)) === 0).map((pt, idx) => (
              <text
                key={idx}
                x={pt.x}
                y={height - 10}
                fill="var(--text-secondary)"
                fontSize="10"
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
              >
                {formatXTime(pt.pt.timestamp)}
              </text>
            ))}
          </svg>

          {/* Interactive Tooltip Box */}
          {hoverIndex !== null && coords[hoverIndex] && (
            <div
              style={{
                position: 'absolute',
                top: `${(coords[hoverIndex].y / height) * 100}%`,
                left: `${(coords[hoverIndex].x / width) * 100}%`,
                transform: 'translate(-50%, -120%)',
                background: 'var(--bg-surface)',
                border: `1px solid ${color}`,
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                fontSize: '11px',
                pointerEvents: 'none',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                whiteSpace: 'nowrap',
                zIndex: 10,
              }}
            >
              <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginBottom: '2px' }}>
                {formatXTime(coords[hoverIndex].pt.timestamp)}
              </div>
              <div style={{ color, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                {activeMetric.toUpperCase()}: {formatYLabel(coords[hoverIndex].val)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
