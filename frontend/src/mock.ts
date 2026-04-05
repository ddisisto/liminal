/**
 * Mock conversation data for the PoC.
 * Loads actual project docs and presents them as a conversation.
 */

import type { TokenData } from './types'
import { mockTokens } from './stream'

// Vite raw imports — loads file content as strings at build time
import briefRaw from '../../docs/project-brief.md?raw'
import archRaw from '../../docs/architecture-plan.md?raw'
import theoryRaw from '../../docs/theory.md?raw'
import attentionRaw from '../../docs/research/attention-instrumentation.md?raw'
import annotationRaw from '../../docs/research/token-annotation-systems.md?raw'

/** A turn in a mock conversation. */
export interface MockTurn {
  role: 'user' | 'assistant'
  tokens: TokenData[]
  text?: string
}

/** User prompts interspersed between doc sections. */
const USER_PROMPTS = [
  'Tell me about the premise of this project.',
  'What are the design principles?',
  'Walk me through the layer model.',
  'What about the interference model?',
  'Now tell me about the architecture.',
  'How does the WebSocket protocol work?',
  'What does the storage schema look like?',
  'And the data flow?',
  'What are the design constraints?',
  'Now the theoretical foundations — the oscillator analogy.',
  'How does game theory apply here?',
  'What about the user-model as proxy?',
  'And memetic acceleration?',
  'What are you honestly uncertain about?',
  'What does the research say about attention instrumentation?',
  'What about existing token annotation tools?',
  'How should we handle streaming overlays?',
  'What rendering approach do you recommend?',
]

/**
 * Split a markdown document into sections (by ## headings),
 * then split each section into paragraphs.
 * Returns an array of non-empty paragraph strings.
 */
function docToParagraphs(raw: string): string[] {
  return raw
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    // Skip the title line and horizontal rules
    .filter(p => !p.startsWith('# ') || p.startsWith('## '))
    .filter(p => p !== '---')
    // Keep headings as short paragraphs, body text as long ones
}

/**
 * Build a mock conversation from the project docs.
 * Paragraphs become assistant turns; user prompts are interspersed
 * at section boundaries (## headings).
 */
function buildConversation(): MockTurn[] {
  const allParagraphs = [
    ...docToParagraphs(briefRaw),
    ...docToParagraphs(archRaw),
    ...docToParagraphs(theoryRaw),
    ...docToParagraphs(attentionRaw),
    ...docToParagraphs(annotationRaw),
  ]

  const turns: MockTurn[] = []
  let promptIndex = 0

  for (const para of allParagraphs) {
    // Insert a user turn before each heading
    if (para.startsWith('## ') && promptIndex < USER_PROMPTS.length) {
      turns.push({
        role: 'user',
        tokens: [],
        text: USER_PROMPTS[promptIndex++],
      })
    }

    // Assistant turn: the paragraph content
    turns.push({
      role: 'assistant',
      tokens: mockTokens(para),
    })
  }

  return turns
}

export const MOCK_CONVERSATION: MockTurn[] = buildConversation()
