/**
 * Document registry and loader.
 *
 * At build time, Vite bundles all .md files in the repo (excluding
 * node_modules, .venv, .claude). At runtime, documents are loaded
 * lazily: first from IndexedDB (prior visit), then parsed from
 * the bundle and stored.
 *
 * Document ID = repo-relative path (e.g. 'docs/architecture-plan.md').
 */

import type { TokenData } from './types'
import { mockTokens } from './stream'
import {
  getDocument, putDocument, getBlocks, putBlocks,
  putReadingSession, getLatestSession, updateSessionPosition,
  type StoredDocument, type StoredBlock,
} from './store'
import type { Turn } from './session-client'

// ── Build-time bundle ─────────────────────────────────────

// Vite glob import: all .md files, excluding deps and config dirs.
// Each value is a lazy loader that returns the raw string.
const mdModules = import.meta.glob<string>(
  ['../../**/*.md', '!../../node_modules/**', '!../../.venv/**', '!../../.claude/**', '!../../dist/**'],
  { query: '?raw', import: 'default' },
)

// Normalise Vite's keys (e.g. '../../docs/foo.md') to repo-relative paths ('docs/foo.md')
const bundledDocs = new Map<string, () => Promise<string>>()
for (const [vitePath, loader] of Object.entries(mdModules)) {
  const repoPath = vitePath.replace(/^\.\.\/\.\.\//, '')
  bundledDocs.set(repoPath, loader)
}

/** Check if a path exists in the build-time bundle. */
export function hasBundledDoc(path: string): boolean {
  return bundledDocs.has(path)
}

/** List all bundled document paths. */
export function listBundledDocs(): string[] {
  return [...bundledDocs.keys()]
}

// ── Paragraph splitter ────────────────────────────────────

function splitParagraphs(raw: string): string[] {
  return raw
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    // Skip the top-level title (rendered as the HTML h1 hero)
    .filter(p => !p.startsWith('# ') || p.startsWith('## '))
    // Skip horizontal rules
    .filter(p => p !== '---')
}

function textToTurns(text: string): Turn[] {
  const paragraphs = splitParagraphs(text)
  return paragraphs.map(p => ({
    role: 'content' as const,
    tokens: mockTokens(p),
    text: p,
  }))
}

// ── Path resolution ───────────────────────────────────────

/**
 * Resolve a relative link href against the current document's path.
 * e.g. resolveLink('document-model.md', 'docs/architecture-plan.md')
 *   → 'docs/document-model.md'
 */
export function resolveLink(href: string, fromPath: string): string {
  // Strip any anchor/hash
  const clean = href.split('#')[0]
  if (!clean) return fromPath  // same-page anchor

  // Absolute paths (start with /) are repo-relative already
  if (clean.startsWith('/')) return clean.slice(1)

  // Relative: resolve against the directory of fromPath
  const dir = fromPath.includes('/') ? fromPath.replace(/\/[^/]+$/, '/') : ''
  const resolved = dir + clean

  // Normalise: collapse ../ and ./
  const parts: string[] = []
  for (const part of resolved.split('/')) {
    if (part === '..') parts.pop()
    else if (part !== '.') parts.push(part)
  }
  return parts.join('/')
}

// ── Document loading ──────────────────────────────────────

export interface DocumentSession {
  turns: Turn[]
  documentId: string
  path: string
  readingSessionId: string
  lastPosition: number
}

/**
 * Open a document by repo-relative path.
 * Tries IndexedDB first, then the build-time bundle.
 * Creates a new reading session (or resumes from prior position).
 */
export async function openDocument(path: string): Promise<DocumentSession | null> {
  const docId = path

  // Try IndexedDB first
  const existing = await getDocument(docId)
  if (existing) {
    const blocks = await getBlocks(docId)
    if (blocks.length > 0) {
      const priorSession = await getLatestSession(docId)
      const lastPosition = priorSession?.position ?? 0

      const turns: Turn[] = blocks.map(b => ({
        role: b.role as Turn['role'],
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
        docId,
        started: Date.now(),
        lastActive: Date.now(),
        position: lastPosition,
      })

      console.log(`[liminal] opened from IndexedDB: ${path} (${blocks.length} blocks, position ${lastPosition})`)
      return { turns, documentId: docId, path, readingSessionId, lastPosition }
    }
  }

  // Try build-time bundle
  const loader = bundledDocs.get(path)
  if (!loader) return null

  const raw = await loader()
  const turns = textToTurns(raw)
  const now = Date.now()

  // Derive title from first heading or filename
  const titleMatch = raw.match(/^#\s+(.+)/m)
  const title = titleMatch ? titleMatch[1] : path.replace(/^.*\//, '').replace(/\.md$/, '')

  const doc: StoredDocument = {
    id: docId,
    title,
    source: { type: 'file', ref: path },
    created: now,
  }

  const blocks: StoredBlock[] = turns.map((t, i) => ({
    docId,
    index: i,
    role: t.role,
    tokens: t.tokens.map(tok => tok.text),
    text: t.text,
    created: now,
  }))

  await putDocument(doc)
  await putBlocks(blocks)

  const readingSessionId = crypto.randomUUID()
  await putReadingSession({
    id: readingSessionId,
    docId,
    started: now,
    lastActive: now,
    position: 0,
  })

  console.log(`[liminal] imported from bundle: ${path} (${blocks.length} blocks)`)
  return { turns, documentId: docId, path, readingSessionId, lastPosition: 0 }
}
