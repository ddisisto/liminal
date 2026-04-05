/**
 * Pretext.js wrapper — font config, layout measurement, resize handling.
 */

import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext'
import type { LayoutLinesResult, PreparedTextWithSegments } from '@chenglou/pretext'

const FONT = '16px Inter, system-ui, sans-serif'
const LINE_HEIGHT = 24

export interface MeasureResult {
  prepared: PreparedTextWithSegments
  layout: LayoutLinesResult
}

/** Measure text layout for a given container width. */
export function measure(text: string, maxWidth: number): MeasureResult {
  const prepared = prepareWithSegments(text, FONT)
  const layout = layoutWithLines(prepared, maxWidth, LINE_HEIGHT)
  return { prepared, layout }
}

/** Get the configured font string (for CSS consistency). */
export function getFont(): string {
  return FONT
}

/** Get the configured line height. */
export function getLineHeight(): number {
  return LINE_HEIGHT
}
