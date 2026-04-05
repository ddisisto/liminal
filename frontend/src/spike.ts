/**
 * Pretext.js spike — streaming token rendering proof of concept.
 *
 * Goal: render tokens one at a time as individual <span> elements,
 * using Pretext for text measurement, with a simple arrival animation.
 * Each token carries metadata as data attributes for future use.
 */

import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext'

// --- Mock data: pre-tokenized text with fake metadata ---

interface TokenData {
  text: string
  logprob: number
  entropy: number
  surprisal: number
}

// Simulated model output — a paragraph of tokens with fake metrics
const MOCK_TOKENS: TokenData[] = [
  { text: 'The ', logprob: -0.5, entropy: 1.2, surprisal: 0.5 },
  { text: 'coupled ', logprob: -3.1, entropy: 4.8, surprisal: 3.1 },
  { text: 'oscillator ', logprob: -4.2, entropy: 5.1, surprisal: 4.2 },
  { text: 'analogy ', logprob: -2.8, entropy: 3.9, surprisal: 2.8 },
  { text: 'runs ', logprob: -1.9, entropy: 3.2, surprisal: 1.9 },
  { text: 'deeper ', logprob: -2.1, entropy: 3.5, surprisal: 2.1 },
  { text: 'than ', logprob: -0.8, entropy: 1.5, surprisal: 0.8 },
  { text: 'it ', logprob: -0.3, entropy: 0.9, surprisal: 0.3 },
  { text: 'first ', logprob: -1.2, entropy: 2.1, surprisal: 1.2 },
  { text: 'appears. ', logprob: -1.8, entropy: 2.8, surprisal: 1.8 },
  { text: 'The ', logprob: -0.4, entropy: 1.1, surprisal: 0.4 },
  { text: 'model ', logprob: -1.5, entropy: 2.4, surprisal: 1.5 },
  { text: 'has ', logprob: -0.6, entropy: 1.3, surprisal: 0.6 },
  { text: 'a ', logprob: -0.2, entropy: 0.7, surprisal: 0.2 },
  { text: 'natural ', logprob: -1.7, entropy: 2.6, surprisal: 1.7 },
  { text: 'frequency ', logprob: -2.5, entropy: 3.8, surprisal: 2.5 },
  { text: '— ', logprob: -1.1, entropy: 2.0, surprisal: 1.1 },
  { text: 'the ', logprob: -0.3, entropy: 0.8, surprisal: 0.3 },
  { text: 'statistical ', logprob: -2.9, entropy: 4.2, surprisal: 2.9 },
  { text: 'rhythms ', logprob: -3.5, entropy: 4.9, surprisal: 3.5 },
  { text: 'of ', logprob: -0.2, entropy: 0.6, surprisal: 0.2 },
  { text: 'its ', logprob: -0.5, entropy: 1.0, surprisal: 0.5 },
  { text: 'training ', logprob: -1.4, entropy: 2.3, surprisal: 1.4 },
  { text: 'distribution, ', logprob: -2.2, entropy: 3.4, surprisal: 2.2 },
  { text: 'the ', logprob: -0.3, entropy: 0.8, surprisal: 0.3 },
  { text: 'priors, ', logprob: -2.7, entropy: 4.0, surprisal: 2.7 },
  { text: 'the ', logprob: -0.3, entropy: 0.8, surprisal: 0.3 },
  { text: 'default ', logprob: -1.6, entropy: 2.5, surprisal: 1.6 },
  { text: 'patterns ', logprob: -1.8, entropy: 2.8, surprisal: 1.8 },
  { text: 'of ', logprob: -0.2, entropy: 0.6, surprisal: 0.2 },
  { text: 'fluency ', logprob: -3.0, entropy: 4.5, surprisal: 3.0 },
  { text: 'and ', logprob: -0.4, entropy: 0.9, surprisal: 0.4 },
  { text: 'engagement ', logprob: -2.3, entropy: 3.6, surprisal: 2.3 },
  { text: 'that ', logprob: -0.5, entropy: 1.0, surprisal: 0.5 },
  { text: 'emerge ', logprob: -2.0, entropy: 3.1, surprisal: 2.0 },
  { text: 'from ', logprob: -0.4, entropy: 0.9, surprisal: 0.4 },
  { text: 'compression ', logprob: -2.6, entropy: 3.9, surprisal: 2.6 },
  { text: 'of ', logprob: -0.2, entropy: 0.6, surprisal: 0.2 },
  { text: 'human ', logprob: -1.3, entropy: 2.2, surprisal: 1.3 },
  { text: 'text.', logprob: -1.0, entropy: 1.8, surprisal: 1.0 },
]

const MOCK_TOKENS_2: TokenData[] = toTokens(
  'The user has a natural frequency too — their cognitive preferences, reading rhythms, ' +
  'attention patterns, the conceptual frames they habitually reach for. The conversation is ' +
  'the shared platform. And the coupling strength is the degree to which each system\'s ' +
  'behaviour influences the other\'s.'
)

const MOCK_TOKENS_3: TokenData[] = toTokens(
  'Most current chat interfaces are strongly coupled in one direction — model output dominates ' +
  'the user\'s attention — and weakly coupled in the other. User feedback is sparse, delayed, ' +
  'coarse-grained. The metronomes are on a tilted platform. Synchronisation, when it occurs, ' +
  'tends to mean the user has entrained to the model\'s rhythm rather than the reverse. ' +
  'Liminal proposes to level the platform and tune the coupling. The user\'s attention signals ' +
  'become a continuous influence on the model\'s behaviour. The model\'s internal states become ' +
  'visible to the user. And the quality of the interaction is measured not by synchronisation — ' +
  'which is just another word for predictability — but by the richness of the phase relationship ' +
  'between the two. In the physics of coupled oscillators, the regime between full synchronisation ' +
  'and full independence is where complex dynamics live. It is also, not coincidentally, where ' +
  'information transfer between the oscillators is maximised.'
)

const MOCK_USER_INPUT = 'What does the phase boundary actually look like in practice?'

/** Quick helper: split a string into word-boundary tokens with random-ish metadata */
function toTokens(text: string): TokenData[] {
  return text.split(/(?<=\s)/).map(word => ({
    text: word,
    logprob: -(Math.random() * 4 + 0.2),
    entropy: Math.random() * 5 + 0.5,
    surprisal: Math.random() * 4 + 0.2,
  }))
}

// --- Font and layout constants ---

const FONT = '16px Inter, system-ui, sans-serif'
const LINE_HEIGHT = 24

// --- Pretext integration ---

function getContainerWidth(): number {
  const container = document.getElementById('timeline')!
  return container.clientWidth
}

function measureText(text: string) {
  const prepared = prepareWithSegments(text, FONT)
  const maxWidth = getContainerWidth()
  const result = layoutWithLines(prepared, maxWidth, LINE_HEIGHT)
  return { prepared, result }
}

// --- Token rendering ---

function createTokenSpan(token: TokenData, position: number): HTMLSpanElement {
  const span = document.createElement('span')
  span.className = 'token token--entering'
  span.textContent = token.text
  span.dataset.position = String(position)
  span.dataset.logprob = String(token.logprob)
  span.dataset.entropy = String(token.entropy)
  span.dataset.surprisal = String(token.surprisal)

  // Trigger animation on next frame
  requestAnimationFrame(() => {
    span.classList.remove('token--entering')
  })

  return span
}

// --- Streaming simulation ---

async function streamTokens(
  tokens: TokenData[],
  blockEl: HTMLElement,
  tokensPerSecond: number = 40,
): Promise<void> {
  const cursor = document.createElement('span')
  cursor.className = 'cursor'
  blockEl.appendChild(cursor)

  const statusEl = document.getElementById('status')!
  let fullText = ''

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    fullText += token.text

    // Create and insert token span before cursor
    const span = createTokenSpan(token, i)
    blockEl.insertBefore(span, cursor)

    // Measure with Pretext (the thing we're actually testing)
    const { result } = measureText(fullText)
    statusEl.textContent =
      `tokens: ${i + 1}/${tokens.length} | ` +
      `lines: ${result.lineCount} | ` +
      `height: ${result.height}px | ` +
      `entropy: ${token.entropy.toFixed(1)}`

    // Wait for next token
    await sleep(1000 / tokensPerSecond)
  }

  // Remove cursor when done
  cursor.remove()
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// --- Main ---

function createBlock(timeline: HTMLElement, role: 'assistant' | 'user'): HTMLElement {
  const block = document.createElement('div')
  block.className = `block block--${role}`
  timeline.appendChild(block)
  return block
}

async function main() {
  await document.fonts.ready

  const timeline = document.getElementById('timeline')!

  // First assistant paragraph
  await streamTokens(MOCK_TOKENS, createBlock(timeline, 'assistant'))
  await sleep(800)

  // Second assistant paragraph
  await streamTokens(MOCK_TOKENS_2, createBlock(timeline, 'assistant'))
  await sleep(1200)

  // User turn (appears instantly — user typed it)
  const userBlock = createBlock(timeline, 'user')
  userBlock.textContent = MOCK_USER_INPUT
  await sleep(600)

  // Third assistant paragraph (longer response)
  await streamTokens(MOCK_TOKENS_3, createBlock(timeline, 'assistant'))

  const statusEl = document.getElementById('status')!
  statusEl.textContent += ' | done'
}

main()
