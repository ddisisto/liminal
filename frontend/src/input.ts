/**
 * Fixed input area at the bottom of the viewport.
 * Auto-grows from 1 line to ~30 lines, then scrolls internally.
 * Font scales down as the input grows.
 */

export type SubmitHandler = (text: string) => void

const FONT_MAX = 1.0    // rem — single line
const FONT_MIN = 0.82   // rem — at max height
const MAX_ROWS = 30

export class InputArea {
  readonly wrapper: HTMLElement
  readonly textarea: HTMLTextAreaElement
  private onSubmit: SubmitHandler | null = null

  constructor() {
    this.wrapper = document.createElement('div')
    this.wrapper.id = 'input-area'

    this.textarea = document.createElement('textarea')
    this.textarea.rows = 1
    this.textarea.placeholder = '...'
    this.textarea.spellcheck = false
    this.wrapper.appendChild(this.textarea)

    this.textarea.addEventListener('input', () => this.autoGrow())
    this.textarea.addEventListener('keydown', (e) => this.handleKey(e))
  }

  /** Mount into the DOM. */
  mount(parent: HTMLElement): void {
    parent.appendChild(this.wrapper)
  }

  /** Register submit handler (Enter key). */
  onSubmitHandler(handler: SubmitHandler): void {
    this.onSubmit = handler
  }

  /** Change placeholder text. */
  setPlaceholder(text: string): void {
    this.textarea.placeholder = text
  }

  private autoGrow(): void {
    const ta = this.textarea

    // Reset to measure natural height
    ta.style.height = 'auto'
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight)
    const maxHeight = lineHeight * MAX_ROWS

    // Clamp and set
    const natural = ta.scrollHeight
    const clamped = Math.min(natural, maxHeight)
    ta.style.height = clamped + 'px'
    ta.style.overflowY = natural > maxHeight ? 'auto' : 'hidden'

    // Scale font based on how full we are
    const rows = Math.max(1, Math.round(clamped / lineHeight))
    const t = Math.min(1, (rows - 1) / (MAX_ROWS - 1))
    const fontSize = FONT_MAX - (FONT_MAX - FONT_MIN) * t
    ta.style.fontSize = fontSize + 'rem'
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const text = this.textarea.value.trim()
      if (text && this.onSubmit) {
        this.onSubmit(text)
        this.textarea.value = ''
        this.autoGrow()
      }
    }
  }
}
