/**
 * Viewport follows the cursor — but only when the user hasn't
 * manually scrolled away. Detects scroll-down-at-tip for JIT pull.
 */

import type { CursorPosition } from './cursor'
import type { Timeline } from './timeline'

type TipPullListener = () => void

export class Viewport {
  private scrollContainer: HTMLElement
  private timeline: Timeline
  private _userHasControl = false
  private _atTip = true
  private tipPullListeners: TipPullListener[] = []
  private ticking = false
  private touchStartY = 0
  private pinchStartDist = 0
  private pinchBaseScale = 1
  private _userScale = 1

  constructor(scrollContainer: HTMLElement, timeline: Timeline) {
    this.scrollContainer = scrollContainer
    this.timeline = timeline
    this.setupScrollListener()
  }

  /** Is the viewport following the live edge? */
  get atTip(): boolean {
    return this._atTip
  }

  /** Has the user manually scrolled away from auto-follow? */
  get userHasControl(): boolean {
    return this._userHasControl
  }

  /** Register for "user scrolled down at tip" events — the JIT pull signal. */
  onTipPull(listener: TipPullListener): () => void {
    this.tipPullListeners.push(listener)
    return () => {
      this.tipPullListeners = this.tipPullListeners.filter(l => l !== listener)
    }
  }

  /** Called when cursor moves — auto-scroll only if user hasn't taken control. */
  onCursorMove(_position: CursorPosition, atTip: boolean): void {
    this._atTip = atTip
    this.updateVisualState(atTip)

    if (atTip && !this._userHasControl) {
      this.scrollToTipPosition()
    }
  }

  /** Scroll to tip and relinquish user control (back to auto-follow). */
  returnToTip(): void {
    this._userHasControl = false
    this.scrollToTipPosition()
  }

  /**
   * Scroll so the last content block sits ~2/3 down from the top of the viewport.
   * The bottom 1/3 is empty space (via CSS padding-bottom: 66vh on #timeline).
   * This gives the live edge breathing room and visually separates it from
   * where input will be.
   */
  private scrollToTipPosition(): void {
    const lastBlock = this.timeline.getBlock(this.timeline.length - 1)
    if (!lastBlock) return

    const blockRect = lastBlock.element.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    // We want the bottom of the last block at 1/3 from viewport top
    const targetOffsetFromTop = Math.floor(viewportHeight * 2 / 3)
    const scrollDelta = blockRect.bottom - targetOffsetFromTop

    if (scrollDelta > 0) {
      window.scrollBy({ top: scrollDelta })
    }
  }

  private isNearTipPosition(): boolean {
    const lastBlock = this.timeline.getBlock(this.timeline.length - 1)
    if (!lastBlock) return true

    const blockRect = lastBlock.element.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    // "Near tip" = last block's bottom is in the top half of the viewport
    return blockRect.bottom < viewportHeight * 0.85
  }

  private setupScrollListener(): void {
    // Use wheel event to detect deliberate user scroll direction
    this.scrollContainer.addEventListener('wheel', (e) => {
      if (this.ticking) return
      this.ticking = true

      requestAnimationFrame(() => {
        this.ticking = false
        this.handleWheel(e.deltaY)
      })
    }, { passive: true })

    // Touch events for mobile — scroll direction + pinch-to-scale
    this.scrollContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.touchStartY = e.touches[0].clientY
      } else if (e.touches.length === 2) {
        this.pinchStartDist = this.touchDist(e.touches)
        this.pinchBaseScale = this._userScale
      }
    }, { passive: true })

    // Pinch move — must be non-passive to preventDefault (block native zoom)
    this.scrollContainer.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const dist = this.touchDist(e.touches)
        const ratio = dist / this.pinchStartDist
        this.setUserScale(this.pinchBaseScale * ratio)
      }
    }, { passive: false })

    this.scrollContainer.addEventListener('touchend', (e) => {
      if (e.touches.length === 0 && this.pinchStartDist === 0) {
        // Single-finger end — handle scroll direction
        const deltaY = this.touchStartY - (e.changedTouches[0]?.clientY ?? this.touchStartY)
        if (Math.abs(deltaY) > 10) {
          requestAnimationFrame(() => {
            this.handleWheel(deltaY)
          })
        }
      }
      // Reset pinch state when all fingers lift
      if (e.touches.length === 0) {
        this.pinchStartDist = 0
      }
    }, { passive: true })

    // Also handle keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        // Defer to next frame so the scroll has happened
        requestAnimationFrame(() => {
          if (this.isNearTipPosition() && this._atTip) {
            this.emitTipPull()
          }
        })
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        this._userHasControl = true
      }
    })
  }

  private handleWheel(deltaY: number): void {
    if (deltaY < 0) {
      // Scrolling up — user is taking control
      this._userHasControl = true
    } else if (deltaY > 0) {
      // Scrolling down
      if (this.isNearTipPosition()) {
        if (this._userHasControl) {
          // User was in scrollback, has now scrolled back to bottom — return to tip
          this._userHasControl = false
          this.updateVisualState(this._atTip)
        }
        if (this._atTip) {
          // At the bottom AND at tip — this is a pull request
          this.emitTipPull()
        }
      }
    }
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
    // Clamp to reasonable range
    this._userScale = Math.max(0.5, Math.min(2.5, scale))
    document.documentElement.style.setProperty(
      '--user-scale', String(this._userScale),
    )
  }

  private updateVisualState(atTip: boolean): void {
    const inScrollback = this._userHasControl || !atTip
    if (inScrollback) {
      document.body.classList.add('scrollback')
    } else {
      document.body.classList.remove('scrollback')
    }
  }
}
