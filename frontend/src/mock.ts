/**
 * Content loader — splits markdown documents into content blocks.
 * Each block is one paragraph (or heading). No conversation wrapper.
 *
 * Vite raw imports load file content as strings at build time.
 */

import type { TokenData } from './types'
import { mockTokens } from './stream'

// Vite raw imports — loads file content as strings at build time
import readmeRaw from '../../README.md?raw'

/** A content block from a parsed document. */
export interface ContentBlock {
  role: 'content'
  tokens: TokenData[]
  text: string
}

/**
 * Split a markdown document into paragraph blocks.
 * Returns an array of non-empty paragraph strings.
 */
function splitParagraphs(raw: string): string[] {
  return raw
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    // Skip the top-level title (rendered as the HTML h1 hero)
    .filter(p => !p.startsWith('# ') || p.startsWith('## '))
    // Skip horizontal rules
    .filter(p => p !== '---')
}

/**
 * Load README as content blocks.
 * Each paragraph becomes a block with role 'content'.
 */
export function loadReadmeBlocks(): ContentBlock[] {
  // Strip Development and License sections for the demo
  const trimmed = readmeRaw.replace(/## Development[\s\S]*$/, '')
  const paragraphs = splitParagraphs(trimmed)

  return paragraphs.map(text => ({
    role: 'content' as const,
    tokens: mockTokens(text),
    text,
  }))
}
