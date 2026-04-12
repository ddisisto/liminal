/**
 * IndexedDB store — primary persistence for documents, blocks,
 * reading sessions, and attention data.
 *
 * The reader's data lives on their device. Backend sync is opt-in.
 */

const DB_NAME = 'liminal'
const DB_VERSION = 1

/** Document source descriptor. */
export interface DocSource {
  type: 'url' | 'paste' | 'file' | 'chat' | 'mock'
  ref?: string
}

/** Stored document. */
export interface StoredDocument {
  id: string
  title: string
  source: DocSource
  created: number  // Date.now()
  parent?: string
  forkBlock?: number
}

/** Stored block within a document. */
export interface StoredBlock {
  docId: string
  index: number
  role: 'user' | 'assistant' | 'content'
  tokens: string[]
  text?: string        // plain text for user turns
  created: number
}

/** A reading session — one engagement with a document. */
export interface ReadingSession {
  id: string
  docId: string
  started: number
  lastActive: number
  position: number     // last block index in viewport
}

/** Per-block attention within a reading session. */
export interface AttentionRecord {
  sessionId: string
  blockIndex: number
  viewportTime: number // cumulative ms
  visits: number
}

// Composite key for attention: [sessionId, blockIndex]
type AttentionKey = [string, number]

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result

      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents', { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains('blocks')) {
        const blocks = db.createObjectStore('blocks', { keyPath: ['docId', 'index'] })
        blocks.createIndex('byDoc', 'docId')
      }

      if (!db.objectStoreNames.contains('reading_sessions')) {
        const sessions = db.createObjectStore('reading_sessions', { keyPath: 'id' })
        sessions.createIndex('byDoc', 'docId')
      }

      if (!db.objectStoreNames.contains('attention')) {
        db.createObjectStore('attention', { keyPath: ['sessionId', 'blockIndex'] })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Singleton DB connection. */
let dbPromise: Promise<IDBDatabase> | null = null
function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = open()
  return dbPromise
}

/** Promisify an IDB request. */
function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Promisify a transaction's completion. */
function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── Documents ──────────────────────────────────────────────

export async function putDocument(doc: StoredDocument): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('documents', 'readwrite')
  tx.objectStore('documents').put(doc)
  await txDone(tx)
}

export async function getDocument(id: string): Promise<StoredDocument | undefined> {
  const db = await getDb()
  return req(db.transaction('documents').objectStore('documents').get(id))
}

export async function listDocuments(): Promise<StoredDocument[]> {
  const db = await getDb()
  return req(db.transaction('documents').objectStore('documents').getAll())
}

// ── Blocks ─────────────────────────────────────────────────

export async function putBlocks(blocks: StoredBlock[]): Promise<void> {
  if (blocks.length === 0) return
  const db = await getDb()
  const tx = db.transaction('blocks', 'readwrite')
  const store = tx.objectStore('blocks')
  for (const block of blocks) store.put(block)
  await txDone(tx)
}

export async function getBlocks(docId: string): Promise<StoredBlock[]> {
  const db = await getDb()
  const tx = db.transaction('blocks')
  const index = tx.objectStore('blocks').index('byDoc')
  const blocks: StoredBlock[] = await req(index.getAll(docId))
  return blocks.sort((a, b) => a.index - b.index)
}

// ── Reading Sessions ───────────────────────────────────────

export async function putReadingSession(session: ReadingSession): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('reading_sessions', 'readwrite')
  tx.objectStore('reading_sessions').put(session)
  await txDone(tx)
}

export async function getReadingSession(id: string): Promise<ReadingSession | undefined> {
  const db = await getDb()
  return req(db.transaction('reading_sessions').objectStore('reading_sessions').get(id))
}

export async function getSessionsForDoc(docId: string): Promise<ReadingSession[]> {
  const db = await getDb()
  const tx = db.transaction('reading_sessions')
  const index = tx.objectStore('reading_sessions').index('byDoc')
  return req(index.getAll(docId))
}

// ── Attention ──────────────────────────────────────────────

export async function putAttention(record: AttentionRecord): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('attention', 'readwrite')
  tx.objectStore('attention').put(record)
  await txDone(tx)
}

export async function getAttention(sessionId: string, blockIndex: number): Promise<AttentionRecord | undefined> {
  const db = await getDb()
  const key: AttentionKey = [sessionId, blockIndex]
  return req(db.transaction('attention').objectStore('attention').get(key))
}

export async function putAttentionBatch(records: AttentionRecord[]): Promise<void> {
  if (records.length === 0) return
  const db = await getDb()
  const tx = db.transaction('attention', 'readwrite')
  const store = tx.objectStore('attention')
  for (const record of records) store.put(record)
  await txDone(tx)
}

/**
 * Get all attention records for a document across all reading sessions.
 * Returns a Map of blockIndex → total cumulative viewport time (ms).
 */
export async function getDocumentAttention(docId: string): Promise<Map<number, number>> {
  const sessions = await getSessionsForDoc(docId)
  const totals = new Map<number, number>()

  if (sessions.length === 0) return totals

  const db = await getDb()
  const tx = db.transaction('attention')
  const store = tx.objectStore('attention')

  for (const session of sessions) {
    // Scan all attention records — IDB doesn't support prefix queries on
    // composite keys, so we iterate. Fine for the expected data volume.
    const all: AttentionRecord[] = await req(store.getAll())
    for (const rec of all) {
      if (rec.sessionId === session.id) {
        totals.set(rec.blockIndex, (totals.get(rec.blockIndex) ?? 0) + rec.viewportTime)
      }
    }
  }

  return totals
}
