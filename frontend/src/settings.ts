/**
 * Settings panel — cog icon, flyout, controls.
 * Currently: theme toggle, markup toggle.
 * Planned: pace slider, tip position slider, locked future controls.
 */

import type { Timeline } from './timeline'

export class Settings {
  private timeline: Timeline
  private panel: HTMLElement
  private cog: HTMLButtonElement
  private open = false

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

  private applyTheme(theme: 'dark' | 'light'): void {
    document.documentElement.setAttribute('data-theme', theme)
  }

  get theme(): 'dark' | 'light' {
    return document.documentElement.getAttribute('data-theme') === 'light'
      ? 'light' : 'dark'
  }
}
