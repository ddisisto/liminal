/**
 * Mock conversation data for the PoC.
 * Loads actual project docs and presents them as a conversation.
 */

import type { TokenData } from './types'
import { mockTokens } from './stream'

// Vite raw imports — loads file content as strings at build time
import readmeRaw from '../../README.md?raw'
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

/** Transitional prompts interspersed between doc sections. */
const SECTION_PROMPTS = [
  'OK so what is this pull thing?',
  'What\'s happening with the text size?',
  'What\'s the bigger idea here?',
  'How is this built?',
  'Where does this go beyond chat?',
  'What am I actually experiencing right now?',
  'What comes next?',
  'OK, go deeper. What\'s the core premise?',
  'What are the design principles behind this?',
  'Walk me through the layers.',
  'What about when reader and text start influencing each other?',
  'How is this built?',
  'How does the streaming protocol work?',
  'What does the storage layer look like?',
  'And the data flow?',
  'What are the hard constraints?',
  'Tell me about the oscillator analogy.',
  'How does game theory fit in?',
  'What about modelling the reader?',
  'And memetic acceleration?',
  'What are the honest unknowns?',
  'What does existing research say about attention instrumentation?',
  'What about token-level annotation tools?',
  'How should streaming overlays work?',
  'What rendering approach makes sense?',
]

/**
 * Split a markdown document into sections (by ## headings),
 * then split each section into paragraphs.
 * Returns an array of non-empty paragraph strings.
 */
function docToParagraphs(raw: string): string[] {
  // Strip fenced code blocks before splitting
  const withoutCode = raw.replace(/```[\s\S]*?```/g, '')
  return withoutCode
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    // Skip horizontal rules and blockquotes (GitHub disclaimer)
    .filter(p => p !== '---')
    .filter(p => !p.startsWith('>'))
    // Keep headings as short paragraphs, body text as long ones
}

/**
 * Build a mock conversation from the project docs.
 * Paragraphs become assistant turns; user prompts are interspersed
 * at section boundaries (## headings).
 */
function buildConversation(): MockTurn[] {
  // Strip Development and License sections from README for the demo
  const readmeTrimmed = readmeRaw.replace(/## Development[\s\S]*$/, '')
  const allParagraphs = [
    ...docToParagraphs(readmeTrimmed),
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
    if (para.startsWith('## ') && promptIndex < SECTION_PROMPTS.length) {
      turns.push({
        role: 'user',
        tokens: [],
        text: SECTION_PROMPTS[promptIndex++],
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
