# Token-Level Annotation and Visualization Systems for LLM Output

*Research survey for Liminal's Layer 2 (annotation) and Layer 3 (analytical overlays). See [project brief](../project-brief.md) for the layer model.*

Prior art in token-level visualization, annotation UX, and analytical overlays.

---

## 1. Existing Tools for Token-Level LLM Metadata Visualization

### Research Tools

**BertViz** (Jesse Vig, [github.com/jessevig/bertviz](https://github.com/jessevig/bertviz)) is the canonical attention visualizer for transformer models. It renders attention head patterns as interactive SVG-based diagrams in Jupyter notebooks, supporting most HuggingFace models. BertViz focuses exclusively on attention weights rather than output-side metrics like logprobs or entropy. Its rendering is static per inference -- it does not handle streaming. Relevant to Liminal: BertViz demonstrates that per-head, per-layer attention data can be rendered as colored arcs between token positions, but its Jupyter-only context limits UX lessons for browser-native tools.

**Ecco** (Jay Alammar, [github.com/jalammar/ecco](https://github.com/jalammar/ecco)) goes beyond attention to offer token-level saliency via feature attribution methods (Integrated Gradients, DeepLift, Saliency, etc., powered by Captum). It produces inline heatmap overlays on token text -- color-coded backgrounds indicating attribution strength. It also supports neuron activation analysis via NMF. Ecco renders in Jupyter using custom HTML/JS widgets. Relevant to Liminal: Ecco's inline token-coloring UX (background color mapped to a scalar metric) is the closest existing pattern to what Liminal's entropy/surprisal overlays need. The key difference is Ecco operates on completed generations, not streams.

**Google LIT** (Learning Interpretability Tool, [pair-code.github.io/lit](https://pair-code.github.io/lit/)) is a browser-based model analysis platform from Google PAIR. It provides salience maps, attention visualization, embedding projections, and counterfactual editing. Its "Sequence Salience" module highlights which prompt tokens most influence each output token. LIT is framework-agnostic but requires a Python model server backend. Relevant to Liminal: LIT's modular UI architecture (independent visualization panels that cross-reference each other) is a strong UX pattern. Its limitation is that it targets offline analysis -- no streaming support, and the tool is oriented toward model developers rather than end users interacting with a chat interface.

**LogitScope** ([arxiv.org/abs/2603.24929](https://arxiv.org/abs/2603.24929), March 2026) is a recent framework that computes entropy, varentropy, and surprisal from token probability distributions during inference. It wraps HuggingFace Transformers and requires no labeled data. It can run in real-time, making it architecturally close to what Liminal's WebSocket metadata stream would provide. LogitScope does not include a visualization frontend -- it is a computation framework only.

**Brendan Bycroft's LLM Visualization** ([bbycroft.net/llm](https://bbycroft.net/llm)) is a 3D WebGL walkthrough of GPT-style transformer internals. It renders matrix operations, attention patterns, and token embeddings as interactive 3D scenes. Architecturally impressive but solves a different problem (education about model internals) rather than output-level metadata overlay.

### Production/API Tools

**OpenAI Playground** provides inline logprob visualization: tokens are color-coded by probability (shades of yellow/green), and clicking a token reveals its logprob and top-k alternatives in a popover. This is the closest production precedent to Liminal's core UX. Key limitation: it only works on completed responses, not streaming. The color-coding uses CSS background colors on `<span>` elements, one per token.

**OpenAI API** returns logprobs via the `logprobs` and `top_logprobs` parameters (up to 5 alternatives per token position). This is the canonical wire format for per-token metadata and directly informs Liminal's WebSocket message schema.

**Anthropic API** now supports logprobs with a similar structure (`logprob`, `top_logprobs` fields). As of early 2026, the streaming response format includes per-token probability data. Neither Anthropic's Console nor Claude.ai exposes logprob visualization in the UI.

**Sanand0's LLM Hallucination Visualizer** ([sanand0.github.io/llmviz](https://sanand0.github.io/llmviz/)) is a lightweight browser tool that color-codes tokens by logprob to highlight potential hallucinations. Simple but demonstrates the core pattern: color = f(logprob) applied as inline CSS.

---

## 2. Text Annotation Interfaces -- UX Patterns

### Key Tools

**brat** ([brat.nlplab.org](https://brat.nlplab.org/)) is the foundational web-based annotation tool for NLP. Its core UX: select a text span by dragging, a dialog appears for label assignment. brat renders annotations as **SVG overlays** on text -- arcs for relations, colored boxes for entity spans. This SVG-on-text approach is directly relevant to Liminal. Known issues: text selection inside SVG elements is unreliable across browsers (notably broken in Opera, inconsistent in Firefox). brat's embedding API allows its visualizations to be used as read-only components in other pages.

**Prodigy** ([prodi.gy](https://prodi.gy/)) from Explosion (spaCy team) takes a radically different approach: minimal UI, one decision at a time, keyboard-driven. Its "ner.manual" recipe presents text with highlight-to-annotate interaction. Active learning prioritizes uncertain examples. Relevant lesson for Liminal: Prodigy proves that a minimal floating interface (accept/reject/label) outperforms complex annotation panels for speed. This validates Liminal's "floating input for freeform tagging" design.

**Label Studio** ([labelstud.io](https://labelstud.io/)) is the most configurable open-source option (20k+ GitHub stars). It supports span labeling, relation annotation, and multi-annotator workflows. Rendering uses DOM-based spans with CSS highlights. Label Studio's flexibility comes at a cost: initial setup is heavy and the UI can feel sluggish compared to brat or Prodigy for pure text tasks.

**doccano** ([github.com/doccano/doccano](https://github.com/doccano/doccano)) prioritizes simplicity -- drag to select, click a label. Its entity highlighting uses colored `<span>` backgrounds in the DOM. Fast keyboard shortcuts for label assignment. Relevant to Liminal: doccano's simplicity is a good benchmark for minimum viable annotation UX.

### UX Patterns That Work

- **Highlight-to-annotate**: Select text span, then assign label. Universal across all tools. Works because it matches how people naturally interact with text.
- **Keyboard shortcuts for labels**: Prodigy and doccano both show that number keys mapped to labels dramatically increase annotation speed.
- **Inline color coding**: Every tool uses background color on text spans. The convention is well-established and users understand it immediately.
- **Floating/minimal dialogs**: Prodigy's approach of a small floating panel near the selection outperforms full-page forms.
- **Overlapping span support**: brat handles this via SVG arcs; DOM-based tools (doccano, Label Studio) struggle with overlapping annotations.

### What Doesn't Work

- **Requiring precise click targets on small tokens**: brat's SVG annotation boxes can be hard to click on short tokens.
- **Complex multi-step dialogs for simple labels**: Label Studio's configurability adds friction for simple tasks.
- **Text selection conflicts**: When annotation UI competes with native browser text selection, users get confused. brat partially solved this by rendering text in SVG, but that breaks Copy/Paste expectations.

---

## 3. Overlaying Visualizations on Streaming Text

This is Liminal's most novel technical challenge. No existing tool does this well.

### The Core Problem

When tokens stream in one at a time, any visualization overlay must handle:
1. **Layout instability**: New tokens cause line breaks, shifting all subsequent content. An overlay positioned at pixel coordinates becomes stale.
2. **Incremental rendering**: Overlays must be added per-token without re-rendering the entire overlay layer.
3. **Scroll anchoring**: The viewport is typically auto-scrolling to follow new content. Overlays on previously-rendered tokens must move with the text.

### How Existing Tools Avoid the Problem

Most tools (Ecco, LIT, OpenAI Playground, brat) simply **do not support streaming**. They wait for complete text, then render overlays as a post-processing step. Chat UIs (ChatGPT, Claude.ai) stream text but do not overlay metadata.

Fred Jonsson's work on [rendering real-time UIs with streaming structured LLM completions](https://medium.com/@enginoid/rendering-realtime-uis-with-streaming-structured-llm-completions-5d10479cefc0) addresses a related problem: partitioning streaming tokens into different UI sections. The key insight is that streaming tokens into a single container is trivial, but routing them to different visual regions requires buffering and structural parsing.

### Approaches for Liminal

**Option A: Defer overlays until line is stable.** Render text tokens immediately, but only add visualization overlays once a line of text is complete (i.e., the next token causes a line break or a paragraph ends). This avoids layout thrash at the cost of delayed visualization.

**Option B: Re-measure on every token.** Use Pretext.js to compute layout after each token arrival, and reposition overlays accordingly. If Pretext.js layout is ~0.0002ms per call, this is feasible at typical token rates (20-80 tokens/sec). The overlay layer (canvas or SVG) would be redrawn each frame.

**Option C: Append-only overlay with correction.** Render each token's overlay inline (as a colored `<span>` or similar), which naturally flows with text. On line-break events, no repositioning is needed because the overlay IS the text styling. This is what the OpenAI Playground does (CSS backgrounds on token spans), and it is the simplest approach. The tradeoff: it limits overlay types to inline styles (no floating labels, no arcs, no secondary canvas layer).

**Recommended hybrid**: Use Option C (inline CSS) for the primary heatmap layer (entropy/surprisal as background color), and Option B (Pretext.js re-measurement) for the annotation layer (floating labels, tag indicators) that needs precise positioning.

---

## 4. Pretext.js and Text Measurement Without Reflow

**Pretext.js** ([github.com/chenglou/pretext](https://github.com/chenglou/pretext), by Cheng Lou) is the leading library here. It computes text layout (line breaks, text height, character positions) with pure math after an initial font measurement pass, avoiding DOM reflow entirely.

### How It Works

1. `prepare()`: Splits text into segments, measures segment widths using an offscreen canvas, caches results.
2. `layout()`: Pure math -- walks cached segment widths, accumulates until `maxWidth`, breaks to new line. Each call takes ~0.0002ms.

This two-phase approach means the first call has a setup cost (canvas measurement), but subsequent layout calls are effectively free. For Liminal's use case -- re-measuring layout as tokens stream in -- this is ideal: `prepare()` once per font/size configuration, then `layout()` on every token arrival.

### Key Features

- Full Unicode support via `Intl.Segmenter` (CJK, Thai, Arabic RTL, emoji)
- Works with Canvas, SVG, and DOM rendering targets
- ~15KB bundled size
- 300-600x faster than DOM-based measurement

### Alternatives

**uWrap.js**: A 2KB micro-library optimized for Latin-only text in data tables. Much faster for ASCII (~80ms vs Pretext's ~2200ms for large ASCII texts in benchmarks), but no Unicode/emoji/RTL support. Not suitable for Liminal's multilingual requirements.

**CSS `text-wrap: balance`** and **`interpolate-size`**: Native CSS features that handle some text sizing cases but cannot provide programmatic access to character positions -- they solve a different problem.

**W3C FontMetrics API**: A proposed browser API that would provide native text measurement without reflow. Not yet implemented in any browser. Would eventually make libraries like Pretext unnecessary, but is years away.

### Tradeoffs for Liminal

Pretext.js is the right choice for computing overlay positions, but with caveats:
- The initial `prepare()` cost matters if font settings change frequently.
- Pretext gives you line breaks and text height, but not per-character bounding boxes. For precise token-level overlay positioning, you may need to supplement with `canvas.measureText()` for individual token widths.
- Browser `Intl.Segmenter` support is now universal in modern browsers (Chrome, Firefox, Safari all support it).

---

## 5. Rendering Approaches for Token-Level Heatmaps/Overlays

### Option 1: CSS Backgrounds on DOM Spans

Render each token as a `<span>` with a `background-color` derived from the metric value. This is what OpenAI Playground, Ecco (via HTML widgets), doccano, and most annotation tools use.

**Pros**: Simplest implementation. Text selection works natively. Accessibility is preserved (screen readers see normal text). Scales well because the browser handles layout.

**Cons**: Limited to rectangular highlights. No gradients between tokens, no floating labels, no arcs or connectors. Overlapping annotations are hard. Styling options are constrained to CSS properties.

**Performance**: Excellent for up to ~10k spans. Beyond that, DOM node count becomes a concern. Virtual scrolling mitigates this.

### Option 2: Canvas Overlay

Render text in the DOM normally, then overlay a `<canvas>` element positioned absolutely on top. Use Pretext.js (or `getBoundingClientRect()` on token spans) to determine where to paint heatmap rectangles, arcs, or other visualizations.

**Pros**: Arbitrary drawing (gradients, curves, custom shapes). High performance for dense visualizations (heatmaps with thousands of tokens). Canvas is essentially a bitmap buffer -- performance is ~constant regardless of object count.

**Cons**: Canvas content is invisible to screen readers. Text selection on the underlying DOM can be blocked by the canvas (solvable with `pointer-events: none`). Canvas must be manually synchronized with DOM layout (resize, scroll). Retina/HiDPI requires explicit scaling (`devicePixelRatio`).

**Performance**: Best for >1k tokens with dense overlays. Per Apache ECharts benchmarks, canvas maintains near-constant performance regardless of element count, while SVG degrades.

### Option 3: SVG Overlay

Similar to canvas overlay, but using SVG elements. This is what brat uses for annotation arcs and entity boxes.

**Pros**: SVG elements are in the DOM, so they respond to CSS hover/click events natively. Arbitrary precision rendering. Print-quality output. Browser zoom works correctly.

**Cons**: Performance degrades with element count (brat becomes sluggish on documents with >500 annotations). Each SVG element is a DOM node with full event handling overhead. On Safari, SVG performance degradation is reportedly exponential.

**Performance**: Good for <500 overlay elements. Not suitable for dense per-token heatmaps on long documents.

### Option 4: Hybrid (Recommended for Liminal)

Use **CSS backgrounds** for the primary heatmap layer (entropy, surprisal, logprob coloring on token spans). This is Layer 3's bread-and-butter visualization: simple, performant, accessible.

Use **Canvas** for advanced overlay features: inter-token arcs, attention flow diagrams, probability distribution sparklines, or any visualization that goes beyond inline styling. Set `pointer-events: none` on the canvas and handle interactions on the underlying DOM spans.

Use **SVG** sparingly for annotation markers that need to be interactive DOM elements (e.g., tag badges on annotated spans, relation arrows between small numbers of spans). Keep SVG element count low (<200).

### Interaction with Text Selection

A critical detail: overlaying canvas or SVG on text breaks native text selection unless handled carefully. The pattern is:
1. Render text in normal DOM elements.
2. Position canvas/SVG overlays with `position: absolute` and `pointer-events: none`.
3. All click/hover events pass through to the DOM text layer.
4. For annotation interactions (clicking a specific overlay element), use hit-testing on the canvas layer or switch specific SVG elements to `pointer-events: auto`.

---

## Summary: Implementation Implications for Liminal

| Concern | Recommendation |
|---|---|
| Token metadata schema | Follow OpenAI/Anthropic logprobs format: `{token, logprob, top_logprobs: [{token, logprob}]}`, extended with computed `entropy` and `surprisal` fields (a la LogitScope) |
| Primary heatmap | CSS `background-color` on `<span>` per token. Simple, accessible, streams naturally |
| Annotation UX | Highlight-to-annotate (drag select), floating minimal dialog for label/tag (Prodigy pattern), keyboard shortcuts for frequent labels |
| Overlay positioning | Pretext.js for layout computation, supplemented by `canvas.measureText()` for per-token widths |
| Advanced visualization | Canvas overlay with `pointer-events: none` for dense/complex visuals |
| Streaming stability | Inline CSS approach for heatmaps (no repositioning needed); Pretext.js re-measurement for positioned overlays (cost is negligible at token rates) |
| Text selection | Keep text in DOM, overlays as pass-through layers |

---

*Research compiled April 2026. Items sourced from web search are noted with URLs. General descriptions of tools (BertViz, Ecco, brat, Prodigy, etc.) draw on both web search results and training data knowledge. LogitScope and Pretext.js details are from 2026 web search results.*
