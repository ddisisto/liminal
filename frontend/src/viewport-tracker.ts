/**
 * Viewport time tracker — L1 attention capture.
 *
 * Uses IntersectionObserver to track which blocks are visible and for how long.
 * Pauses on blur/visibilitychange (AFK gating).
 * Batches and sends completed intervals to the backend periodically.
 * Maintains live cumulative attention per block as a CSS custom property
 * (--attention: 0→1) for real-time visual feedback.
 */

import type { ViewportEvent } from './session-client'
import { putAttentionBatch, getDocumentAttention, type AttentionRecord } from './store'

/** Minimal interface for the tracker — doesn't require a full SessionClient. */
export interface TrackerClient {
  readingSessionId: string
  sendViewportEvents(events: ViewportEvent[]): void
}

interface TrackedBlock {
  blockId: string
  blockIndex: number
  element: HTMLElement
  visibleSince: number | null  // Date.now() when entered viewport, null if not visible
  totalMs: number              // cumulative viewport time
  visits: number               // times scrolled back to this block
  dirty: boolean               // needs persisting to IndexedDB
  seen: boolean                // has crossed the visibility threshold
  seenAccum: number            // ms accumulated toward the seen threshold (across visibility gaps)
  lastVisible: number          // Date.now() of last visibility end (0 if never)
}

const BATCH_INTERVAL_MS = 5000
const MIN_DURATION_MS = 200     // ignore sub-200ms flickers
const WARM_THRESHOLD_MS = 30000 // 30s of viewport time = fully "warm" (--attention: 1)
const UPDATE_INTERVAL_MS = 500  // how often to update live attention values
const SEEN_THRESHOLD_MS = 1500  // 1.5s continuous visibility before block counts as "seen"

export class ViewportTracker {
  private blocks: TrackedBlock[] = []
  private observer: IntersectionObserver
  private pendingEvents: ViewportEvent[] = []
  private sessionId: string
  private client: TrackerClient
  private active = true  // false when tab/window is not focused
  private batchTimer: number
  private updateTimer: number
  private priorAttention: Map<number, number> = new Map()

  constructor(client: TrackerClient) {
    this.client = client
    this.sessionId = client.readingSessionId

    this.observer = new IntersectionObserver(
      (entries) => this.onIntersection(entries),
      { threshold: [0, 0.25, 0.5, 0.75, 1.0] },
    )

    // AFK gating
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause()
      } else {
        this.resume()
      }
    })

    window.addEventListener('blur', () => this.pause())
    window.addEventListener('focus', () => this.resume())

    // Periodic flush to backend
    this.batchTimer = window.setInterval(() => this.flush(), BATCH_INTERVAL_MS)

    // Periodic live attention update
    this.updateTimer = window.setInterval(() => this.updateLiveAttention(), UPDATE_INTERVAL_MS)

    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush())
  }

  /**
   * Start tracking a block element. Call when a block is added to the timeline.
   * @param seen - true for resumed blocks that the reader has already seen
   */
  track(element: HTMLElement, blockId: string, seen = false): void {
    const blockIndex = this.blocks.length
    const priorMs = this.priorAttention.get(blockIndex) ?? 0
    const hasPrior = priorMs > 0
    const isSeen = seen || hasPrior
    const block: TrackedBlock = {
      blockId, blockIndex, element, visibleSince: null,
      totalMs: priorMs, visits: 0, dirty: false,
      seen: isSeen, seenAccum: isSeen ? SEEN_THRESHOLD_MS : 0,
      lastVisible: 0,
    }
    const attention = Math.min(1, priorMs / WARM_THRESHOLD_MS)
    element.style.setProperty('--attention', attention.toFixed(3))
    if (!isSeen) element.classList.add('block--unseen')
    this.blocks.push(block)
    this.observer.observe(element)
  }

  /**
   * Load prior attention data from IndexedDB for a document.
   * Call before blocks are tracked to seed warmth from previous sessions.
   */
  async loadPriorAttention(docId: string): Promise<void> {
    this.priorAttention = await getDocumentAttention(docId)
  }

  /** Check if a block meets the attention threshold:
   *  fully visible, OR occupies >= 30% of viewport. */
  private meetsAttentionThreshold(entry: IntersectionObserverEntry): boolean {
    if (!entry.isIntersecting) return false
    // Fully visible
    if (entry.intersectionRatio >= 0.99) return true
    // Large block: occupies >= 30% of viewport
    const viewportHeight = entry.rootBounds?.height ?? window.innerHeight
    return entry.intersectionRect.height / viewportHeight >= 0.3
  }

  private onIntersection(entries: IntersectionObserverEntry[]): void {
    const now = Date.now()
    for (const entry of entries) {
      const block = this.blocks.find(b => b.element === entry.target)
      if (!block) continue

      const qualifies = this.meetsAttentionThreshold(entry) && this.active

      if (qualifies) {
        block.element.classList.add('block--in-viewport')
        if (block.visibleSince === null) {
          block.visibleSince = now
          block.visits++
          block.dirty = true
        }
      } else {
        block.element.classList.remove('block--in-viewport')
        this.closeInterval(block, now)
      }
    }
  }

  /** Update --attention on all currently-visible blocks, handle unseen→seen transitions. */
  private updateLiveAttention(): void {
    if (!this.active) return
    const now = Date.now()
    for (const block of this.blocks) {
      if (block.visibleSince === null) continue
      const elapsed = now - block.visibleSince

      // Unseen→seen transition: accumulate toward threshold
      if (!block.seen) {
        const currentAccum = block.seenAccum + elapsed
        if (currentAccum >= SEEN_THRESHOLD_MS) {
          block.seen = true
          block.element.classList.remove('block--unseen')
          // Start attention from the overflow past the threshold
          const overflow = currentAccum - SEEN_THRESHOLD_MS
          block.totalMs = overflow
          block.visibleSince = now
          block.dirty = true
        }
        // Don't update --attention until seen
        continue
      }

      const total = block.totalMs + elapsed
      const attention = Math.min(1, total / WARM_THRESHOLD_MS)
      block.element.style.setProperty('--attention', attention.toFixed(3))
    }
  }

  private closeInterval(block: TrackedBlock, now: number): void {
    if (block.visibleSince === null) return
    const duration = now - block.visibleSince
    block.visibleSince = null
    block.lastVisible = now
    block.dirty = true

    // Unseen blocks: accumulate toward seen threshold but don't record attention
    if (!block.seen) {
      block.seenAccum += duration
      if (block.seenAccum >= SEEN_THRESHOLD_MS) {
        block.seen = true
        block.element.classList.remove('block--unseen')
        // Credit overflow as attention
        const overflow = block.seenAccum - SEEN_THRESHOLD_MS
        block.totalMs = overflow
        block.dirty = true
      }
      return
    }

    block.totalMs += duration
    block.dirty = true

    // Update CSS immediately on close
    const attention = Math.min(1, block.totalMs / WARM_THRESHOLD_MS)
    block.element.style.setProperty('--attention', attention.toFixed(3))

    if (duration < MIN_DURATION_MS) return

    this.pendingEvents.push({
      session_id: this.sessionId,
      sequence_id: block.blockId,
      visible_from: new Date(now - duration).toISOString(),
      visible_to: new Date(now).toISOString(),
      duration_ms: duration,
      confidence: 'active',
    })
  }

  private pause(): void {
    if (!this.active) return
    this.active = false
    const now = Date.now()
    // Close all open intervals as 'active' — the time before pause was real engagement
    for (const block of this.blocks) {
      this.closeInterval(block, now)
    }
  }

  private resume(): void {
    if (this.active) return
    this.active = true
    const now = Date.now()
    // Re-check which blocks are currently visible and start new intervals
    // IntersectionObserver won't re-fire, so we check manually
    for (const block of this.blocks) {
      const rect = block.element.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const visibleTop = Math.max(0, rect.top)
      const visibleBottom = Math.min(viewportHeight, rect.bottom)
      const visibleHeight = Math.max(0, visibleBottom - visibleTop)
      const fullyVisible = rect.top >= 0 && rect.bottom <= viewportHeight
      const occupiesEnough = visibleHeight / viewportHeight >= 0.3
      if (fullyVisible || occupiesEnough) {
        block.element.classList.add('block--in-viewport')
        if (block.visibleSince === null) {
          block.visibleSince = now
        }
      } else {
        block.element.classList.remove('block--in-viewport')
      }
    }
  }

  private flush(): void {
    // Persist to IndexedDB
    const dirtyBlocks = this.blocks.filter(b => b.dirty)
    if (dirtyBlocks.length > 0) {
      const records: AttentionRecord[] = dirtyBlocks.map(b => ({
        sessionId: this.sessionId,
        blockIndex: b.blockIndex,
        viewportTime: b.totalMs,
        visits: b.visits,
        lastVisible: b.lastVisible || undefined,
      }))
      putAttentionBatch(records).catch(() => {})
      for (const b of dirtyBlocks) b.dirty = false
    }

    // Sync to backend (if live)
    if (this.pendingEvents.length === 0) return
    const batch = this.pendingEvents.splice(0)
    this.client.sendViewportEvents(batch)
  }

  destroy(): void {
    this.observer.disconnect()
    clearInterval(this.batchTimer)
    clearInterval(this.updateTimer)
    // Close all open intervals and flush
    const now = Date.now()
    for (const block of this.blocks) {
      this.closeInterval(block, now)
    }
    this.flush()
  }
}
