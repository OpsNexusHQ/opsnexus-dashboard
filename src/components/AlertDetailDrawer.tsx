import { useCallback, useEffect, useState } from 'react'
import { StatusBadge } from './StatusBadge'
import {
  type Alert,
  type AlertComment,
  acknowledgeAlert,
  fetchAlertComments,
  addAlertComment,
} from '../api/alerts'

interface Props {
  alert: Alert | null
  onClose: () => void
  onAlertUpdated: () => void
}

export function AlertDetailDrawer({ alert, onClose, onAlertUpdated }: Props) {
  const [comments, setComments] = useState<AlertComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [ackComment, setAckComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submittingAck, setSubmittingAck] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)

  const loadComments = useCallback(async () => {
    if (!alert) return
    setLoading(true)
    try {
      const res = await fetchAlertComments(alert.id)
      setComments(res.comments)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [alert])

  useEffect(() => {
    if (alert) {
      queueMicrotask(() => {
        loadComments()
      })
    }
  }, [alert, loadComments])

  if (!alert) return null

  const handleAcknowledge = async () => {
    setSubmittingAck(true)
    try {
      await acknowledgeAlert(alert.id, ackComment)
      setAckComment('')
      onAlertUpdated()
      loadComments()
    } catch {
      /* ignore */
    } finally {
      setSubmittingAck(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setSubmittingComment(true)
    try {
      await addAlertComment(alert.id, newComment.trim())
      setNewComment('')
      loadComments()
    } catch {
      /* ignore */
    } finally {
      setSubmittingComment(false)
    }
  }

  const fmtTs = (ts?: string) => (ts ? new Date(ts).toLocaleString() : '—')

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '420px',
        maxWidth: '100vw',
        height: '100vh',
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Drawer Header */}
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface)',
        }}
      >
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {alert.rule_name || alert.message}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
            ID: {alert.id}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      {/* Drawer Content */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Status Strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <StatusBadge status={alert.status === 'firing' ? 'offline' : alert.status === 'acknowledged' ? 'stale' : 'healthy'} />
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              background: alert.severity === 'critical' ? 'var(--offline-dim)' : 'var(--stale-dim)',
              color: alert.severity === 'critical' ? 'var(--offline)' : 'var(--stale)',
            }}
          >
            {alert.severity || 'warning'}
          </span>
        </div>

        {/* Details Grid */}
        <div className="agent-card-meta" style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
          <div className="agent-meta-item">
            <div className="agent-meta-label">Agent ID</div>
            <div className="agent-meta-value">{alert.agent_id}</div>
          </div>
          <div className="agent-meta-item">
            <div className="agent-meta-label">Triggered At</div>
            <div className="agent-meta-value">{fmtTs(alert.started_at)}</div>
          </div>
          {alert.acknowledged_at && (
            <div className="agent-meta-item">
              <div className="agent-meta-label">Acknowledged At</div>
              <div className="agent-meta-value">{fmtTs(alert.acknowledged_at)}</div>
            </div>
          )}
          {alert.resolved_at && (
            <div className="agent-meta-item">
              <div className="agent-meta-label">Resolved At</div>
              <div className="agent-meta-value">{fmtTs(alert.resolved_at)}</div>
            </div>
          )}
          <div className="agent-meta-item">
            <div className="agent-meta-label">Last Value</div>
            <div className="agent-meta-value">{alert.last_value.toFixed(1)}</div>
          </div>
        </div>

        {/* Acknowledge Action Box */}
        {alert.status === 'firing' && (
          <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--stale-dim)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--stale)', marginBottom: '8px' }}>
              👀 Acknowledge Incident
            </div>
            <input
              type="text"
              placeholder="Optional comment (e.g. Investigating high CPU)..."
              value={ackComment}
              onChange={(e) => setAckComment(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '10px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={handleAcknowledge}
              disabled={submittingAck}
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--stale)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: '#000',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {submittingAck ? 'Acknowledging...' : 'Acknowledge Alert'}
            </button>
          </div>
        )}

        {/* Timeline / Incident Notes */}
        <div>
          <div className="section-title" style={{ marginBottom: '10px' }}>Incident Comments & Notes</div>

          {loading ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading notes...</div>
          ) : comments.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No comments yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {comments.map((c) => (
                <div key={c.id} style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)' }}>{c.author_id}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {fmtTs(c.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{c.comment}</div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Add incident comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'inherit',
              }}
            />
            <button
              type="submit"
              disabled={submittingComment || !newComment.trim()}
              style={{
                padding: '8px 14px',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Post
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
