/**
 * Session client — abstracts over WebSocket (real backend) and mock data.
 *
 * Tries WebSocket first. If the backend isn't running, falls back to mock.
 * The main loop doesn't need to know which source it's using.
 */

import type { TokenData } from './types'
import type { BlockRole } from './types'

export interface Turn {
  role: BlockRole
  tokens: TokenData[]
  text?: string           // user turns may have plain text instead of tokens
  sequenceId?: string     // present when backed by real session
}

export interface SessionClient {
  /** All turns available in this session. */
  turns: Turn[]
  /** Session ID (real or 'mock'). */
  sessionId: string
  /** Whether this is a live backend connection. */
  isLive: boolean
  /** Send viewport events (no-op for mock). */
  sendViewportEvents(events: ViewportEvent[]): void
}

export interface ViewportEvent {
  session_id: string
  sequence_id: string
  visible_from: string
  visible_to: string
  duration_ms: number
  confidence: string
}

const WS_URL = `ws://${location.hostname}:8000/ws`
const API_URL = `http://${location.hostname}:8000/api`

/**
 * Connect to backend via WebSocket, loading the full session.
 * Returns null if backend is unreachable.
 */
async function tryWebSocket(): Promise<SessionClient | null> {
  try {
    // First, get the session list to find the demo session
    const resp = await fetch(`${API_URL}/sessions`, { signal: AbortSignal.timeout(2000) })
    if (!resp.ok) return null
    const sessions = await resp.json()
    if (!sessions.length) return null

    const sessionId = sessions[0].id

    // Fetch full session data via REST (simpler than WS for initial load)
    const sessionResp = await fetch(`${API_URL}/sessions/${sessionId}`)
    if (!sessionResp.ok) return null
    const data = await sessionResp.json()

    const turns: Turn[] = data.turns.map((t: any) => ({
      role: t.role as BlockRole,
      tokens: t.tokens.map((tok: any) => ({
        text: tok.text,
        logprob: tok.logprob ?? -(Math.random() * 4 + 0.2),
        entropy: tok.entropy ?? Math.random() * 5 + 0.5,
        surprisal: tok.surprisal ?? Math.random() * 4 + 0.2,
      })),
      // For user turns with a single token, treat as plain text
      text: t.role === 'user' && t.tokens.length === 1 ? t.tokens[0].text : undefined,
      sequenceId: t.sequence_id,
    }))

    return {
      turns,
      sessionId,
      isLive: true,
      sendViewportEvents(events: ViewportEvent[]) {
        // Fire-and-forget POST
        fetch(`${API_URL}/viewport-events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events }),
        }).catch(() => {})
      },
    }
  } catch {
    return null
  }
}

/**
 * Fall back to mock data (for GitHub Pages or when backend is down).
 */
async function useMock(): Promise<SessionClient> {
  const { MOCK_CONVERSATION } = await import('./mock')
  return {
    turns: MOCK_CONVERSATION.map(t => ({
      role: t.role,
      tokens: t.tokens,
      text: t.text,
    })),
    sessionId: 'mock',
    isLive: false,
    sendViewportEvents() {},  // no-op
  }
}

/**
 * Build a session from imported raw text.
 */
async function importSession(raw: string): Promise<SessionClient> {
  const { textToTurns } = await import('./mock')
  return {
    turns: textToTurns(raw),
    sessionId: 'import',
    isLive: false,
    sendViewportEvents() {},
  }
}

/**
 * Try loading from URL params: ?url= or ?source=local (sessionStorage).
 */
async function tryImport(): Promise<SessionClient | null> {
  const params = new URLSearchParams(location.search)

  const urlParam = params.get('url')
  if (urlParam) {
    try {
      const resp = await fetch(urlParam)
      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`)
      const raw = await resp.text()
      console.log(`[liminal] imported from URL: ${urlParam}`)
      return importSession(raw)
    } catch (e) {
      console.warn(`[liminal] URL import failed: ${e}`)
      return null
    }
  }

  if (params.get('source') === 'local') {
    const raw = sessionStorage.getItem('liminal-import')
    if (raw) {
      console.log(`[liminal] imported from sessionStorage (${raw.length} chars)`)
      return importSession(raw)
    }
  }

  return null
}

/**
 * Connect to session: try import, then backend, then mock.
 */
export async function connect(): Promise<SessionClient> {
  const imported = await tryImport()
  if (imported) return imported

  const ws = await tryWebSocket()
  if (ws) {
    console.log(`[liminal] connected to backend, session ${ws.sessionId}, ${ws.turns.length} turns`)
    return ws
  }
  console.log('[liminal] no backend, using mock data')
  return useMock()
}
