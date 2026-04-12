/**
 * Session client — abstracts over WebSocket (real backend), IndexedDB
 * (stored documents), and mock data.
 *
 * On first load: imports content → stores as document + blocks in IndexedDB.
 * On subsequent loads: reads from IndexedDB (no re-import).
 * Backend connection adds sync and inference capabilities.
 */

import type { TokenData } from './types'
import type { BlockRole } from './types'
import {
  getDocument, putDocument, getBlocks, putBlocks,
  putReadingSession, getLatestSession,
  type StoredDocument, type StoredBlock, type ReadingSession,
} from './store'

export interface Turn {
  role: BlockRole
  tokens: TokenData[]
  text?: string           // user turns may have plain text instead of tokens
  sequenceId?: string     // present when backed by real session
}

export interface SessionClient {
  /** All turns available in this session. */
  turns: Turn[]
  /** Document ID. */
  documentId: string
  /** Reading session ID. */
  readingSessionId: string
  /** Last block position from a prior reading session (0 = fresh read). */
  lastPosition: number
  /** Whether this is a live backend connection. */
  isLive: boolean
  /** Send viewport events (no-op for mock/stored). */
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

const MOCK_DOC_ID = 'readme-content'
const WS_URL = `ws://${location.hostname}:8000/ws`
const API_URL = `http://${location.hostname}:8000/api`

/**
 * Connect to backend via WebSocket, loading the full session.
 * Returns null if backend is unreachable.
 */
async function tryWebSocket(): Promise<SessionClient | null> {
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

    const readingSessionId = crypto.randomUUID()
    await putReadingSession({
      id: readingSessionId,
      docId: sessionId,
      started: Date.now(),
      lastActive: Date.now(),
      position: 0,
    })

    return {
      turns,
      documentId: sessionId,
      readingSessionId,
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

/**
 * Load from IndexedDB if the mock document was previously stored.
 * Returns null if not found.
 */
async function tryStored(): Promise<SessionClient | null> {
  const doc = await getDocument(MOCK_DOC_ID)
  if (!doc) return null

  const blocks = await getBlocks(MOCK_DOC_ID)
  if (blocks.length === 0) return null

  // Check for prior reading position
  const priorSession = await getLatestSession(MOCK_DOC_ID)
  const lastPosition = priorSession?.position ?? 0

  const turns: Turn[] = blocks.map(b => ({
    role: b.role as BlockRole,
    tokens: b.tokens.map(t => ({
      text: t,
      logprob: -(Math.random() * 4 + 0.2),
      entropy: Math.random() * 5 + 0.5,
      surprisal: Math.random() * 4 + 0.2,
    })),
    text: b.text,
  }))

  const readingSessionId = crypto.randomUUID()
  await putReadingSession({
    id: readingSessionId,
    docId: MOCK_DOC_ID,
    started: Date.now(),
    lastActive: Date.now(),
    position: lastPosition,
  })

  console.log(`[liminal] loaded from IndexedDB: ${blocks.length} blocks, resuming from ${lastPosition}`)
  return {
    turns,
    documentId: MOCK_DOC_ID,
    readingSessionId,
    lastPosition,
    isLive: false,
    sendViewportEvents() {},
  }
}

/**
 * Import README as content document, store to IndexedDB, return client.
 */
async function importContent(): Promise<SessionClient> {
  const { loadReadmeBlocks } = await import('./mock')
  const contentBlocks = loadReadmeBlocks()

  const now = Date.now()
  const doc: StoredDocument = {
    id: MOCK_DOC_ID,
    title: 'Liminal',
    source: { type: 'file', ref: 'README.md' },
    created: now,
  }

  const blocks: StoredBlock[] = contentBlocks.map((b, i) => ({
    docId: MOCK_DOC_ID,
    index: i,
    role: b.role,
    tokens: b.tokens.map(tok => tok.text),
    text: b.text,
    created: now,
  }))

  await putDocument(doc)
  await putBlocks(blocks)

  const readingSessionId = crypto.randomUUID()
  await putReadingSession({
    id: readingSessionId,
    docId: MOCK_DOC_ID,
    started: now,
    lastActive: now,
    position: 0,
  })

  console.log(`[liminal] imported content: ${blocks.length} blocks → IndexedDB`)

  return {
    turns: contentBlocks.map(b => ({
      role: b.role,
      tokens: b.tokens,
      text: b.text,
    })),
    documentId: MOCK_DOC_ID,
    readingSessionId,
    lastPosition: 0,
    isLive: false,
    sendViewportEvents() {},
  }
}

/**
 * Connect to session: try backend → try IndexedDB → import mock.
 */
export async function connect(): Promise<SessionClient> {
  // Try live backend first
  const ws = await tryWebSocket()
  if (ws) {
    console.log(`[liminal] connected to backend, document ${ws.documentId}, ${ws.turns.length} turns`)
    return ws
  }

  // Try previously stored document
  const stored = await tryStored()
  if (stored) return stored

  // First load: import content
  console.log('[liminal] no backend, importing content')
  return importContent()
}
