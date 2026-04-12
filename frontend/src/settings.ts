/**
 * Settings panel — cog icon, flyout, controls.
 * Currently: theme toggle, markup toggle.
 * Planned: pace slider, tip position slider, locked future controls.
 */

import type { Timeline } from './timeline'

export class Settings {
  private timeline: Timeline

  constructor(timeline: Timeline) {
    this.timeline = timeline
    this.initTheme()
  }

  /** Set initial theme from system preference (already done by inline script). */
  private initTheme(): void {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light'
    this.applyTheme(isLight ? 'light' : 'dark')
  }

  toggleTheme(): void {
    const current = document.documentElement.getAttribute('data-theme')
    this.applyTheme(current === 'light' ? 'dark' : 'light')
  }

  private applyTheme(theme: 'dark' | 'light'): void {
    document.documentElement.setAttribute('data-theme', theme)
  }

  toggleMarkup(): void {
    this.timeline.setRendered(!this.timeline.rendered)
  }

  get markup(): 'raw' | 'rich' {
    return this.timeline.rendered ? 'rich' : 'raw'
  }

  get theme(): 'dark' | 'light' {
    return document.documentElement.getAttribute('data-theme') === 'light'
      ? 'light' : 'dark'
  }
}
