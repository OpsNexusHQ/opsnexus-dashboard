const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8080'

export type StreamStatus = 'live' | 'reconnecting' | 'polling'

export interface SSEEvent {
  type: string
  agent_id?: string
  timestamp: string
  metrics?: Record<string, unknown>
  alert?: Record<string, unknown>
  status?: string
  data?: Record<string, unknown>
}

export type EventCallback = (event: SSEEvent) => void
export type StatusCallback = (status: StreamStatus) => void

export class EventStreamClient {
  private eventSource: EventSource | null = null
  private status: StreamStatus = 'polling'
  private listeners: Set<EventCallback> = new Set()
  private statusListeners: Set<StatusCallback> = new Set()
  private reconnectAttempts = 0
  private maxReconnectDelay = 30000
  private reconnectTimer: number | null = null
  private isClosed = false

  private url: string

  constructor(url: string = `${BASE_URL}/api/v1/events`) {
    this.url = url
  }

  public connect() {
    this.isClosed = false;
    this.initEventSource()
  }

  private initEventSource() {
    if (this.isClosed) return

    try {
      this.eventSource = new EventSource(this.url)

      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0
        this.setStatus('live')
      }

      this.eventSource.onerror = () => {
        if (this.eventSource) {
          this.eventSource.close()
          this.eventSource = null
        }

        if (!this.isClosed) {
          this.setStatus('reconnecting')
          this.scheduleReconnect()
        }
      }

      // Standard SSE event listeners
      const eventTypes = [
        'telemetry.updated',
        'agent.registered',
        'agent.status_changed',
        'alert.firing',
        'alert.resolved',
        'ping',
      ]

      for (const type of eventTypes) {
        this.eventSource.addEventListener(type, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data) as SSEEvent
            this.notifyListeners(data)
          } catch {
            /* ignore parse errors */
          }
        })
      }
    } catch {
      this.setStatus('polling')
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return

    this.reconnectAttempts++
    // Exponential backoff with max delay
    const delay = Math.min(
      1000 * Math.pow(1.5, this.reconnectAttempts),
      this.maxReconnectDelay,
    )

    if (this.reconnectAttempts > 3) {
      this.setStatus('polling')
    }

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.initEventSource()
    }, delay)
  }

  public subscribe(cb: EventCallback): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  public onStatus(cb: StatusCallback): () => void {
    this.statusListeners.add(cb)
    cb(this.status)
    return () => this.statusListeners.delete(cb)
  }

  private setStatus(status: StreamStatus) {
    if (this.status === status) return
    this.status = status
    for (const listener of this.statusListeners) {
      listener(status)
    }
  }

  private notifyListeners(event: SSEEvent) {
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  public disconnect() {
    this.isClosed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.setStatus('polling')
  }
}

// Global singleton client for the dashboard
export const globalEventStream = new EventStreamClient()
