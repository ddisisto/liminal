/** Per-token metadata from inference (or mock). */
export interface TokenData {
  text: string
  logprob: number
  entropy: number
  surprisal: number
}

/** Who authored a block. */
export type BlockRole = 'user' | 'assistant'

/** A block in the conversation timeline. */
export interface Block {
  id: string
  role: BlockRole
  tokens: TokenData[]
  element: HTMLElement
  /** Raw text content for markdown rendering. Built from tokens or user input. */
  rawText: string
}
