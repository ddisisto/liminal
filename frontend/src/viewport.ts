/**
 * Viewport scroll detection and JIT pull signalling.
 * The viewport is always user-controlled — the system never auto-scrolls.
 *
 * Pull detection: when the gap between the last block and the input area
 * exceeds a threshold, the next turn is pulled in. Works with any scroll
 * method — wheel, touch, keyboard, scrollbar drag.
 *
 * A visual indicator in the gap shows progress toward the pull threshold.
 */

import type { Timeline } from './timeline'

type TipPullListener = () => void

/** How much visible gap (px) between last block and input triggers a pull. */
const PULL_GAP_THRESHOLD = 200


export class Viewport {
  private timeline: Timeline
  private tipPullListeners: TipPullListener[] = []
  private ticking = false
  private pullLocked = false
  private pinchStartDist = 0
  private pinchBaseScale = 1
  private _userScale = 1
  private pullIndicator: HTMLElement

  constructor(scrollContainer: HTMLElement, timeline: Timeline) {
    this.timeline = timeline
    this.pullIndicator = this.createPullIndicator()
    this.setupScrollListener(scrollContainer)
  }

  /** Register for "user scrolled down at tip" events — the JIT pull signal. */
  onTipPull(listener: TipPullListener): () => void {
    this.tipPullListeners.push(listener)
    return () => {
      this.tipPullListeners = this.tipPullListeners.filter(l => l !== listener)
    }
  }

  /**
   * Scroll so the last content block sits ~2/3 down from the top of the viewport.
   * Called once after a user-initiated action (pull, End key).
   */
  scrollToTip(): void {
    const lastBlock = this.timeline.getBlock(this.timeline.length - 1)
    if (!lastBlock) return

    const blockRect = lastBlock.element.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const targetOffsetFromTop = Math.floor(viewportHeight * 2 / 3)
    const scrollDelta = blockRect.bottom - targetOffsetFromTop

    if (scrollDelta > 0) {
      window.scrollBy({ top: scrollDelta })
    }
  }

  /**
   * Measure the gap between the last block's bottom and the input area top.
   * Returns the gap only when the last block is visible on screen (its bottom
   * is within the viewport). Returns 0 if in scrollback.
   */
  private measureGap(): number {
    const inputArea = document.getElementById('input-area')
    if (!inputArea) return 0

    const inputTop = inputArea.getBoundingClientRect().top
    const lastBlock = this.timeline.getBlock(this.timeline.length - 1)

    // Before any blocks exist, measure from the timeline container's top
    const refBottom = lastBlock
      ? lastBlock.element.getBoundingClientRect().bottom
      : this.timeline.element.getBoundingClientRect().top

    // Only count the gap if the reference point is visible on screen
    if (refBottom < 0 || refBottom > inputTop) return 0

    return inputTop - refBottom
  }

  private createPullIndicator(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'pull-indicator'
    document.body.appendChild(el)
    return el
  }

  private updatePullIndicator(): void {
    const gap = this.measureGap()
    const progress = Math.max(0, Math.min(1, gap / PULL_GAP_THRESHOLD))

    if (progress <= 0) {
      this.pullIndicator.style.opacity = '0'
    } else {
      this.pullIndicator.style.opacity = String(progress * 0.6)
    }
  }

  private setupScrollListener(scrollContainer: HTMLElement): void {
    // Gap-based pull detection — fires on any scroll method
    window.addEventListener('scroll', () => {
      if (this.ticking) return
      this.ticking = true

      requestAnimationFrame(() => {
        this.ticking = false
        this.updatePullIndicator()
        if (!this.pullLocked && this.measureGap() > PULL_GAP_THRESHOLD) {
          this.pullLocked = true
          this.emitTipPull()
        }
      })
    }, { passive: true })

    // Touch: pinch-to-zoom
    scrollContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        this.pinchStartDist = this.touchDist(e.touches)
        this.pinchBaseScale = this._userScale
      }
    }, { passive: true })

    scrollContainer.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const dist = this.touchDist(e.touches)
        const ratio = dist / this.pinchStartDist
        this.setUserScale(this.pinchBaseScale * ratio)
      }
    }, { passive: false })

    scrollContainer.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        this.pinchStartDist = 0
      }
    }, { passive: true })
  }

  /** Allow the next pull to fire. Call after delivered content is ready. */
  unlockPull(): void {
    this.pullLocked = false
  }

  emitTipPull(): void {
    for (const listener of this.tipPullListeners) {
      listener()
    }
  }

  /** Current user font-scale multiplier (1.0 = default). */
  get userScale(): number {
    return this._userScale
  }

  private touchDist(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  private setUserScale(scale: number): void {
    this._userScale = Math.max(0.5, Math.min(2.5, scale))
    document.documentElement.style.setProperty(
      '--user-scale', String(this._userScale),
    )
  }
}
