import { useCallback, useEffect, useState } from 'react'
import { Header } from '../components/Header'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorState } from '../components/ErrorState'
import {
  fetchNotificationChannels,
  createNotificationChannel,
  deleteNotificationChannel,
  testNotificationChannel,
  type NotificationChannel,
} from '../api/notifications'
import {
  fetchAlertRules,
  createAlertRule,
  deleteAlertRule,
  type AlertRule,
} from '../api/alerts'
import {
  fetchApiTokens,
  createApiToken,
  deleteApiToken,
  type ApiToken,
} from '../api/auth'
import { ping } from '../api/client'

export function Settings() {
  const [tab, setTab] = useState<'notifications' | 'rules' | 'tokens' | 'system'>('notifications')
  const [channels, setChannels] = useState<NotificationChannel[]>([])
  const [rules, setRules] = useState<AlertRule[]>([])
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backendOnline, setBackendOnline] = useState(false)

  // Forms
  const [newChanName, setNewChanName] = useState('')
  const [newChanUrl, setNewChanUrl] = useState('')
  const [newChanType, setNewChanType] = useState<'webhook' | 'slack_webhook'>('webhook')

  const [newRuleName, setNewRuleName] = useState('')
  const [newRuleMetric, setNewRuleMetric] = useState('cpu_usage')
  const [newRuleOp, setNewRuleOp] = useState('>')
  const [newRuleThreshold, setNewRuleThreshold] = useState(80)
  const [newRuleSeverity, setNewRuleSeverity] = useState<'info' | 'warning' | 'critical'>('warning')

  const [newTokenName, setNewTokenName] = useState('')
  const [newTokenRole, setNewTokenRole] = useState<'viewer' | 'operator' | 'admin'>('operator')
  const [generatedRawToken, setGeneratedRawToken] = useState<string | null>(null)

  const [testResult, setTestResult] = useState<{ id: string; status: string } | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const online = await ping()
      setBackendOnline(online)

      const [chRes, rRes, tRes] = await Promise.allSettled([
        fetchNotificationChannels(),
        fetchAlertRules(),
        fetchApiTokens(),
      ])

      if (chRes.status === 'fulfilled') setChannels(chRes.value.channels)
      if (rRes.status === 'fulfilled') setRules(rRes.value.rules)
      if (tRes.status === 'fulfilled') setTokens(tRes.value.tokens)

      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      loadData()
    })
  }, [loadData])

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChanName.trim() || !newChanUrl.trim()) return
    try {
      await createNotificationChannel({ name: newChanName, url: newChanUrl, type: newChanType, enabled: true })
      setNewChanName('')
      setNewChanUrl('')
      loadData()
    } catch {
      /* ignore */
    }
  }

  const handleDeleteChannel = async (id: string) => {
    try {
      await deleteNotificationChannel(id)
      loadData()
    } catch {
      /* ignore */
    }
  }

  const handleTestChannel = async (id: string) => {
    setTestResult({ id, status: 'Testing...' })
    try {
      const res = await testNotificationChannel(id)
      setTestResult({ id, status: res.status === 'delivered' ? '✅ Delivered (HTTP 200)' : `❌ ${res.error || 'Failed'}` })
    } catch {
      setTestResult({ id, status: '❌ Dispatch failed' })
    }
  }

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRuleName.trim()) return
    try {
      await createAlertRule({
        name: newRuleName,
        metric: newRuleMetric,
        operator: newRuleOp,
        threshold: Number(newRuleThreshold),
        severity: newRuleSeverity,
        enabled: true,
      })
      setNewRuleName('')
      loadData()
    } catch {
      /* ignore */
    }
  }

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteAlertRule(id)
      loadData()
    } catch {
      /* ignore */
    }
  }

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTokenName.trim()) return
    try {
      const res = await createApiToken(newTokenName, newTokenRole)
      setNewTokenName('')
      setGeneratedRawToken(res.raw_token || null)
      loadData()
    } catch {
      /* ignore */
    }
  }

  const handleDeleteToken = async (id: string) => {
    try {
      await deleteApiToken(id)
      loadData()
    } catch {
      /* ignore */
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <>
      <Header
        title="Settings & Platform Configuration"
        subtitle="Manage notifications, alert rules, API tokens, and retention"
        backendOnline={backendOnline}
        onRefresh={loadData}
      />

      <div className="page-content">
        {error && <ErrorState message={error} onRetry={loadData} />}

        {/* Tab strip */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {(['notifications', 'rules', 'tokens', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${tab === t ? 'var(--accent)' : 'var(--border)'}`,
                background: tab === t ? 'var(--accent-dim)' : 'var(--bg-card)',
                color: tab === t ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textTransform: 'capitalize',
              }}
            >
              {t === 'notifications' ? '🔔 Notification Channels' : t === 'rules' ? '⚡ Alert Rules' : t === 'tokens' ? '🔑 API Tokens' : '⚙️ System'}
            </button>
          ))}
        </div>

        {/* NOTIFICATIONS TAB */}
        {tab === 'notifications' && (
          <div>
            <div className="section-header">
              <div className="section-title">Webhook & Slack Notification Channels</div>
            </div>

            <form onSubmit={handleCreateChannel} className="metric-card" style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Channel Name (e.g. Slack Incident Channel)..."
                value={newChanName}
                onChange={(e) => setNewChanName(e.target.value)}
                style={{ flex: 1, minWidth: '200px', padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px' }}
              />
              <input
                type="url"
                placeholder="Webhook URL (https://hooks.slack.com/...)..."
                value={newChanUrl}
                onChange={(e) => setNewChanUrl(e.target.value)}
                style={{ flex: 2, minWidth: '260px', padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px' }}
              />
              <select
                value={newChanType}
                onChange={(e) => setNewChanType(e.target.value as 'webhook' | 'slack_webhook')}
                style={{ padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px' }}
              >
                <option value="webhook">Generic Webhook</option>
                <option value="slack_webhook">Slack Webhook</option>
              </select>
              <button type="submit" style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                + Add Channel
              </button>
            </form>

            <div className="history-section">
              <div className="history-list">
                <div className="history-row header-row" style={{ gridTemplateColumns: '160px 120px 1fr 180px' }}>
                  <span>Name</span>
                  <span>Type</span>
                  <span>Webhook URL</span>
                  <span>Actions</span>
                </div>
                {channels.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px' }}>
                    <div className="empty-state-title">No notification channels configured</div>
                  </div>
                ) : (
                  channels.map((ch) => (
                    <div key={ch.id} className="history-row" style={{ gridTemplateColumns: '160px 120px 1fr 180px' }}>
                      <span className="val">{ch.name}</span>
                      <span className="ts">{ch.type}</span>
                      <span className="ts" style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>{ch.url}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleTestChannel(ch.id)}
                          style={{ padding: '3px 8px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', fontSize: '11px', cursor: 'pointer' }}
                        >
                          Test
                        </button>
                        <button
                          onClick={() => handleDeleteChannel(ch.id)}
                          style={{ padding: '3px 8px', background: 'var(--offline-dim)', border: '1px solid var(--offline)', borderRadius: 'var(--radius-sm)', color: 'var(--offline)', fontSize: '11px', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                      {testResult && testResult.id === ch.id && (
                        <div style={{ gridColumn: 'span 4', fontSize: '11px', color: 'var(--accent)', marginTop: '4px' }}>
                          {testResult.status}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ALERT RULES TAB */}
        {tab === 'rules' && (
          <div>
            <div className="section-header">
              <div className="section-title">Configured Alert Rules</div>
            </div>

            <form onSubmit={handleCreateRule} className="metric-card" style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Rule Name (e.g. Critical Memory)..."
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                style={{ flex: 1, minWidth: '180px', padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px' }}
              />
              <select value={newRuleMetric} onChange={(e) => setNewRuleMetric(e.target.value)} style={{ padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px' }}>
                <option value="cpu_usage">CPU Usage (%)</option>
                <option value="memory_usage">Memory Usage (%)</option>
                <option value="disk_usage">Disk Usage (%)</option>
                <option value="agent_offline">Agent Offline</option>
              </select>
              <select value={newRuleOp} onChange={(e) => setNewRuleOp(e.target.value)} style={{ padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px' }}>
                <option value=">">&gt;</option>
                <option value=">=">&gt;=</option>
                <option value="<">&lt;</option>
                <option value="==">==</option>
              </select>
              <input
                type="number"
                placeholder="Threshold"
                value={newRuleThreshold}
                onChange={(e) => setNewRuleThreshold(Number(e.target.value))}
                style={{ width: '90px', padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px' }}
              />
              <select value={newRuleSeverity} onChange={(e) => setNewRuleSeverity(e.target.value as 'info' | 'warning' | 'critical')} style={{ padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px' }}>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
                <option value="info">Info</option>
              </select>
              <button type="submit" style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                + Add Rule
              </button>
            </form>

            <div className="history-section">
              <div className="history-list">
                <div className="history-row header-row" style={{ gridTemplateColumns: '180px 140px 100px 100px 100px' }}>
                  <span>Rule Name</span>
                  <span>Metric</span>
                  <span>Condition</span>
                  <span>Severity</span>
                  <span>Action</span>
                </div>
                {rules.map((r) => (
                  <div key={r.id} className="history-row" style={{ gridTemplateColumns: '180px 140px 100px 100px 100px' }}>
                    <span className="val">{r.name}</span>
                    <span className="ts">{r.metric}</span>
                    <span className="ts">{r.operator} {r.threshold}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: r.severity === 'critical' ? 'var(--offline)' : 'var(--stale)' }}>{(r.severity || 'warning').toUpperCase()}</span>
                    <button
                      onClick={() => handleDeleteRule(r.id)}
                      style={{ padding: '3px 8px', background: 'var(--offline-dim)', border: '1px solid var(--offline)', borderRadius: 'var(--radius-sm)', color: 'var(--offline)', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* API TOKENS TAB */}
        {tab === 'tokens' && (
          <div>
            <div className="section-header">
              <div className="section-title">API Authentication Tokens (RBAC)</div>
            </div>

            {generatedRawToken && (
              <div className="error-banner" style={{ background: 'var(--healthy-dim)', border: '1px solid var(--healthy)', color: 'var(--healthy)', marginBottom: '20px' }}>
                <strong>New Token Generated:</strong> Copy it now! It will not be shown again:
                <code style={{ background: 'var(--bg-base)', padding: '4px 8px', borderRadius: '4px', marginLeft: '8px', fontFamily: 'JetBrains Mono, monospace' }}>
                  {generatedRawToken}
                </code>
              </div>
            )}

            <form onSubmit={handleCreateToken} className="metric-card" style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Token Name (e.g. CI/CD Pipeline Agent)..."
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                style={{ flex: 1, minWidth: '220px', padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px' }}
              />
              <select value={newTokenRole} onChange={(e) => setNewTokenRole(e.target.value as 'viewer' | 'operator' | 'admin')} style={{ padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px' }}>
                <option value="operator">Operator (Read/Ack/Manage Rules)</option>
                <option value="viewer">Viewer (Read Only)</option>
                <option value="admin">Admin (Full Access)</option>
              </select>
              <button type="submit" style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                + Generate Token
              </button>
            </form>

            <div className="history-section">
              <div className="history-list">
                <div className="history-row header-row" style={{ gridTemplateColumns: '180px 100px 140px 100px' }}>
                  <span>Token Name</span>
                  <span>Role</span>
                  <span>Created</span>
                  <span>Action</span>
                </div>
                {tokens.map((t) => (
                  <div key={t.id} className="history-row" style={{ gridTemplateColumns: '180px 100px 140px 100px' }}>
                    <span className="val">{t.name}</span>
                    <span className="ts">{t.role}</span>
                    <span className="ts">{new Date(t.created_at).toLocaleDateString()}</span>
                    <button
                      onClick={() => handleDeleteToken(t.id)}
                      style={{ padding: '3px 8px', background: 'var(--offline-dim)', border: '1px solid var(--offline)', borderRadius: 'var(--radius-sm)', color: 'var(--offline)', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SYSTEM TAB */}
        {tab === 'system' && (
          <div>
            <div className="section-header">
              <div className="section-title">System & Telemetry Retention Settings</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-rows">
                <div className="metric-detail-row">
                  <span className="metric-detail-label">Telemetry Retention Period</span>
                  <span className="metric-detail-value">30 Days (Configurable via OPSNEXUS_TELEMETRY_RETENTION)</span>
                </div>
                <div className="metric-detail-row">
                  <span className="metric-detail-label">Hourly Archival Aggregator</span>
                  <span className="metric-detail-value">Enabled (telemetry_hourly table)</span>
                </div>
                <div className="metric-detail-row">
                  <span className="metric-detail-label">API Authentication</span>
                  <span className="metric-detail-value">OPSNEXUS_API_AUTH_ENABLED (Default: Disabled)</span>
                </div>
                <div className="metric-detail-row">
                  <span className="metric-detail-label">Real-Time Event Engine</span>
                  <span className="metric-detail-value">Server-Sent Events (SSE) Hub active</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
