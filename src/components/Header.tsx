import { useEffect, useState } from 'react'
import { globalEventStream, type StreamStatus } from '../api/events'

interface Props {
  title: string
  subtitle?: string
  backendOnline: boolean
  onRefresh: () => void
  refreshing?: boolean
  autoRefreshSeconds?: number
}

export function Header({
  title,
  subtitle,
  backendOnline,
  onRefresh,
  refreshing,
  autoRefreshSeconds,
}: Props) {
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('polling')

  useEffect(() => {
    const unsub = globalEventStream.onStatus((st) => setStreamStatus(st))
    return () => unsub()
  }, [])

  const getStreamBadgeCls = () => {
    switch (streamStatus) {
      case 'live':
        return 'healthy'
      case 'reconnecting':
        return 'stale'
      case 'polling':
        return 'offline'
    }
  }

  const getStreamLabel = () => {
    switch (streamStatus) {
      case 'live':
        return 'Live'
      case 'reconnecting':
        return 'Reconnecting'
      case 'polling':
        return 'Polling'
    }
  }

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-title">{title}</div>
        {subtitle && <div className="header-sub">{subtitle}</div>}
      </div>

      <div className="header-right">
        {/* SSE Stream Status Indicator */}
        <div
          className={`status-badge ${getStreamBadgeCls()}`}
          title={`Real-Time Stream Mode: ${getStreamLabel()}`}
          style={{ fontSize: '11px', padding: '3px 8px' }}
        >
          {getStreamLabel()}
        </div>

        {streamStatus === 'polling' && autoRefreshSeconds != null && (
          <div className="refresh-indicator">
            <div className="refresh-dot" />
            Auto-refresh {autoRefreshSeconds}s
          </div>
        )}

        <div className="header-backend-status">
          <div className={`header-backend-dot ${backendOnline ? 'online' : 'offline'}`} />
          Backend {backendOnline ? 'online' : 'offline'}
        </div>

        <button
          id="refresh-btn"
          className={`header-refresh-btn${refreshing ? ' spinning' : ''}`}
          onClick={onRefresh}
          title="Refresh now"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </header>
  )
}
