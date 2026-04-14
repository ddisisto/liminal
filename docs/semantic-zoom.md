# Semantic zoom

*Extends the block-length scaling from the [design philosophy](design-philosophy.md). See [architecture](architecture.md) for component context.*

**Viewport-density-driven content scaling and collapse.**

---

## Concept

Extend block-length scaling to be viewport-responsive. As more blocks become visible (pinch-zoom out, ctrl+scroll, or reduced font scale), dense content scales down while headings and short blocks hold prominence. At a minimum legibility threshold, blocks collapse to minimal placeholders.

The transition is continuous, not modal — the same gesture that controls pacing now also controls information density.

## Scaling tiers

1. **Reading** (few blocks visible) — current behavior. Full text, block-length font scaling.
2. **Survey** (many blocks visible) — long blocks shrink further, headings and short blocks resist shrinking. Natural outline effect emerges.
3. **Map** (extreme zoom-out) — long blocks collapse to single-line placeholders. Headings remain readable. Structural overview of the whole document.

## Collapse behavior

- Collapsed blocks render as a minimal placeholder (fixed small height, ~4-8px) holding their position in document flow.
- Consecutive collapsed blocks merge into a single "+N" entry on display.
- Zooming back in restores blocks to full content at their original positions.
- Collapsed blocks do not take attention (below legibility threshold, no viewport time recorded).

## Minimum text size detection

- `getComputedStyle(el).fontSize` gives resolved px value.
- `window.visualViewport.scale` gives pinch-zoom multiplier on mobile.
- `window.devicePixelRatio` shifts with ctrl+scroll zoom on desktop.
- Effective rendered size: `resolvedFontSize * visualViewport.scale` (or equivalent DPR calculation).
- Collapse triggers when effective size crosses a configurable legibility threshold.
- Settings option for minimum text size preference.

## Interaction with attention

- Blocks with high accumulated attention resist collapsing — they are "heavy" with invested reading time.
- Unseen blocks collapse eagerly.
- Attention becomes a weight that opposes compression in the scaling function.

## Interaction with existing systems

- Builds on block-length scaling (implemented).
- Interacts with `--user-scale` CSS property.
- Works with standard browser zoom controls (pinch, ctrl+scroll, accessibility zoom).
- Complements pull-driven delivery: semantic zoom is about *reviewing* content already delivered, not controlling delivery pace.

## Open questions

- Exact threshold values for tier transitions.
- How to handle code blocks and tables (already dense, different legibility requirements).
- Whether "+N" collapsed groups should show any content hint (e.g. first heading within the group).
- Animation/transition timing for collapse and expand.
- Interaction with document graph navigation — does zooming out far enough show document-level nodes?
