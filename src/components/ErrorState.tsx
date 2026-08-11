interface Props {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorState({ title = 'Unable to load data', message, onRetry }: Props) {
  return (
    <div className="error-banner" role="alert">
      <span className="error-banner-icon">⚠️</span>
      <div className="error-banner-text">
        <div className="error-banner-title">{title}</div>
        <div>{message}</div>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              marginTop: '8px',
              padding: '4px 10px',
              background: 'var(--offline-dim)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--offline)',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'inherit',
            }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
