/**
 * Session client — backend connection for sync and inference.
 *
 * The primary document loading path is now in documents.ts.
 * This module handles the backend WebSocket connection for
 * live inference and viewport event sync.
 */

import type { TokenData } from './types'
import type { BlockRole } from './types'

export interface Turn {
  role: BlockRole
  tokens: TokenData[]
  text?: string
  sequenceId?: string
}

export interface SessionClient {
  turns: Turn[]
  documentId: string
  readingSessionId: string
  lastPosition: number
  isLive: boolean
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

const API_URL = `http://${location.hostname}:8000/api`

/**
 * Try connecting to the backend. Returns null if unreachable.
 * Reserved for future use when inference is connected.
 */
export async function tryBackend(): Promise<SessionClient | null> {
  try {
    const resp = await fetch(`${API_URL}/sessions`, { signal: AbortSignal.timeout(2000) })
    if (!resp.ok) return null
    const sessions = await resp.json()
    if (!sessions.length) return null

    const sessionId = sessions[0].id
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
      text: t.role === 'user' && t.tokens.length === 1 ? t.tokens[0].text : undefined,
      sequenceId: t.sequence_id,
    }))

    return {
      turns,
      documentId: sessionId,
      readingSessionId: crypto.randomUUID(),
      lastPosition: 0,
      isLive: true,
      sendViewportEvents(events: ViewportEvent[]) {
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
