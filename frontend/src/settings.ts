/**
 * Settings panel — cog icon, flyout, controls.
 * Holds reactive values that other modules read.
 */

import type { Timeline } from './timeline'

export class Settings {
  private timeline: Timeline
  private panel: HTMLElement
  private cog: HTMLButtonElement
  private open = false

  /** Tokens per second for streaming. */
  pace = 60
  /** Gap position as fraction of viewport height (0 = top, 1 = bottom). */
  gap = 0.33

  constructor(timeline: Timeline) {
    this.timeline = timeline
    this.cog = this.buildCog()
    this.panel = this.buildPanel()
    document.body.appendChild(this.cog)
    document.body.appendChild(this.panel)

    this.cog.addEventListener('click', () => this.toggle())
    document.addEventListener('click', (e) => {
      if (this.open && !this.panel.contains(e.target as Node) && e.target !== this.cog) {
        this.close()
      }
    })
  }

  private toggle(): void {
    this.open ? this.close() : this.openPanel()
  }

  private openPanel(): void {
    this.open = true
    this.panel.classList.add('settings-panel--open')
    this.cog.classList.add('settings-cog--open')
  }

  private close(): void {
    this.open = false
    this.panel.classList.remove('settings-panel--open')
    this.cog.classList.remove('settings-cog--open')
  }

  private buildCog(): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'settings-cog'
    btn.title = 'Settings'
    btn.innerHTML = '&#x2699;'
    return btn
  }

  private buildPanel(): HTMLElement {
    const panel = document.createElement('div')
    panel.className = 'settings-panel'

    // Theme toggle
    panel.appendChild(this.buildToggle('Theme', this.theme === 'light', (on) => {
      this.applyTheme(on ? 'light' : 'dark')
    }))

    // Markup toggle
    panel.appendChild(this.buildToggle('Markup', this.timeline.rendered, (on) => {
      this.timeline.setRendered(on)
    }, ['raw', 'rich']))

    // Separator
    panel.appendChild(this.buildSeparator())

    // Pace slider
    panel.appendChild(this.buildSlider('Pace', 5, 300, this.pace, (v) => {
      this.pace = v
    }, (v) => `${v} tps`))

    // Gap slider
    panel.appendChild(this.buildSlider('Gap', 0.05, 0.95, this.gap, (v) => {
      this.gap = v
      this.applyGap()
    }, (v) => `${Math.round(v * 100)}%`))

    // Set initial CSS property
    this.applyGap()

    return panel
  }

  private buildToggle(
    label: string,
    initial: boolean,
    onChange: (on: boolean) => void,
    labels?: [string, string],
  ): HTMLElement {
    const row = document.createElement('label')
    row.className = 'settings-row'

    const text = document.createElement('span')
    text.className = 'settings-label'
    text.textContent = label

    const toggle = document.createElement('button')
    toggle.className = 'settings-toggle'
    let state = initial

    const offLabel = labels?.[0] ?? 'off'
    const onLabel = labels?.[1] ?? 'on'

    const update = () => {
      toggle.textContent = state ? onLabel : offLabel
      toggle.classList.toggle('settings-toggle--on', state)
    }
    update()

    toggle.addEventListener('click', () => {
      state = !state
      update()
      onChange(state)
    })

    row.appendChild(text)
    row.appendChild(toggle)
    return row
  }

  private buildSlider(
    label: string,
    min: number,
    max: number,
    initial: number,
    onChange: (value: number) => void,
    format: (value: number) => string,
  ): HTMLElement {
    const row = document.createElement('div')
    row.className = 'settings-row settings-row--slider'

    const header = document.createElement('div')
    header.className = 'settings-slider-header'

    const text = document.createElement('span')
    text.className = 'settings-label'
    text.textContent = label

    const valueEl = document.createElement('span')
    valueEl.className = 'settings-value'
    valueEl.textContent = format(initial)

    header.appendChild(text)
    header.appendChild(valueEl)

    const input = document.createElement('input')
    input.type = 'range'
    input.className = 'settings-slider'
    input.min = String(min)
    input.max = String(max)
    input.step = max >= 1 ? '1' : '0.01'
    input.value = String(initial)

    input.addEventListener('input', () => {
      const v = parseFloat(input.value)
      valueEl.textContent = format(v)
      onChange(v)
    })

    row.appendChild(header)
    row.appendChild(input)
    return row
  }

  private buildSeparator(): HTMLElement {
    const sep = document.createElement('div')
    sep.className = 'settings-separator'
    return sep
  }

  private applyGap(): void {
    document.documentElement.style.setProperty('--gap', String(Math.round(this.gap * 100)))
  }

  private applyTheme(theme: 'dark' | 'light'): void {
    document.documentElement.setAttribute('data-theme', theme)
  }

  get theme(): 'dark' | 'light' {
    return document.documentElement.getAttribute('data-theme') === 'light'
      ? 'light' : 'dark'
  }
}
