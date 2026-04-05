/**
 * Viewport time tracker — L1 attention capture.
 *
 * Uses IntersectionObserver to track which blocks are visible and for how long.
 * Pauses on blur/visibilitychange (AFK gating).
 * Batches and sends completed intervals to the backend periodically.
 * Maintains live cumulative attention per block as a CSS custom property
 * (--attention: 0→1) for real-time visual feedback.
 */

import type { SessionClient, ViewportEvent } from './session-client'

interface TrackedBlock {
  sequenceId: string
  element: HTMLElement
  visibleSince: number | null  // Date.now() when entered viewport, null if not visible
  totalMs: number              // cumulative viewport time
}

const BATCH_INTERVAL_MS = 5000
const MIN_DURATION_MS = 200     // ignore sub-200ms flickers
const WARM_THRESHOLD_MS = 30000 // 30s of viewport time = fully "warm" (--attention: 1)
const UPDATE_INTERVAL_MS = 500  // how often to update live attention values

export class ViewportTracker {
  private blocks: TrackedBlock[] = []
  private observer: IntersectionObserver
  private pendingEvents: ViewportEvent[] = []
  private sessionId: string
  private client: SessionClient
  private active = true  // false when tab/window is not focused
  private batchTimer: number
  private updateTimer: number

  constructor(client: SessionClient) {
    this.client = client
    this.sessionId = client.sessionId

    this.observer = new IntersectionObserver(
      (entries) => this.onIntersection(entries),
      { threshold: 0.1 },  // 10% visible counts
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

  /** Start tracking a block element. Call when a block is added to the timeline. */
  track(element: HTMLElement, sequenceId: string): void {
    const block: TrackedBlock = { sequenceId, element, visibleSince: null, totalMs: 0 }
    element.style.setProperty('--attention', '0')
    this.blocks.push(block)
    this.observer.observe(element)
  }

  private onIntersection(entries: IntersectionObserverEntry[]): void {
    const now = Date.now()
    for (const entry of entries) {
      const block = this.blocks.find(b => b.element === entry.target)
      if (!block) continue

      if (entry.isIntersecting && this.active) {
        // Entered viewport
        if (block.visibleSince === null) {
          block.visibleSince = now
        }
      } else {
        // Left viewport (or tab went inactive)
        this.closeInterval(block, now)
      }
    }
  }

  /** Update --attention on all currently-visible blocks. */
  private updateLiveAttention(): void {
    if (!this.active) return
    const now = Date.now()
    for (const block of this.blocks) {
      let total = block.totalMs
      if (block.visibleSince !== null) {
        total += now - block.visibleSince
      }
      const attention = Math.min(1, total / WARM_THRESHOLD_MS)
      block.element.style.setProperty('--attention', attention.toFixed(3))
    }
  }

  private closeInterval(block: TrackedBlock, now: number): void {
    if (block.visibleSince === null) return
    const duration = now - block.visibleSince
    block.totalMs += duration
    block.visibleSince = null

    // Update CSS immediately on close
    const attention = Math.min(1, block.totalMs / WARM_THRESHOLD_MS)
    block.element.style.setProperty('--attention', attention.toFixed(3))

    if (duration < MIN_DURATION_MS) return

    this.pendingEvents.push({
      session_id: this.sessionId,
      sequence_id: block.sequenceId,
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
      const isVisible = rect.bottom > 0 && rect.top < viewportHeight
      if (isVisible && block.visibleSince === null) {
        block.visibleSince = now
      }
    }
  }

  private flush(): void {
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
