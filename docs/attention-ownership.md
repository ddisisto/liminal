# Attention Ownership

*Builds on the reader-instrument principles in [design philosophy](design-philosophy.md) — viewport ownership is what makes honest attention measurement possible. See [AI layers](ai-layers.md) for what becomes possible when the reader chooses to share.*

## The inversion

Content consumption on the internet is already deeply instrumented. Every scroll, pause, and click is tracked — but by the server, for the server's purposes, through means and to ends entirely opaque to the consumer. The reader is the subject of measurement, never the beneficiary.

Liminal inverts this. The reader's attention patterns are captured *for the reader*. How far did I get? What did I linger on? What did I skim? When I revisit, that history is made visible — not as surveillance, but as context that reduces cognitive load. The warmth of a border tells me where past-me spent time, and that changes how present-me reads.

This is the core proposition: **your attention, made visible and useful to you.**

## Why attention tracking benefits the reader

The immediate, felt benefit is reduced cognitive load on revisitation. A long text with your own attention heatmap is like marginalia you didn't have to write. You can see where you engaged deeply, where you skimmed, where you stopped last time. This isn't imputed intent — it's simple observed time, gated for AFK, presented without interpretation.

But the benefits compound:

- **Resume position is automatic.** Not a bookmark you set — the system knows where you were because it was watching with you.
- **Reading patterns reveal structure.** Passages that slow you down may be dense, confusing, or important. Passages you skip may be familiar, redundant, or unengaging. Over time, this signal is useful to you.
- **Re-reading is contextualised.** The second pass through a text is a fundamentally different experience when you can see the trace of the first.

## Ownership and sharing

The critical design principle: **attention data belongs to the reader.** It is captured locally, stored locally, and never transmitted without explicit consent.

But ownership implies agency — including the agency to share. If a reader *chooses* to share their attention patterns, new possibilities open:

- **For authors.** Where did readers actually engage? Not page views or time-on-page, but per-paragraph, per-sentence attention. Where did the argument lose people? Where did they lean in? This is feedback at a resolution authors have never had access to — offered voluntarily by readers who want the content to improve.
- **For communities.** Aggregate attention patterns across readers of the same text reveal collective engagement — the passages everyone lingers on, the sections most people skip. A shared attention heatmap is a new kind of annotation layer, emerging from behaviour rather than explicit commentary.
- **For models.** If the reader is in conversation with a language model, shared attention data closes the loop. The model can see not just what it generated, but what was actually read, what was re-read, what was skipped. This is the signal current chat interfaces discard entirely.

## Scale implications

At individual scale, this is a better reading experience. At collective scale, it's something else.

If readers own their attention data and can selectively share it, you get a market for attention signal that doesn't exist today. Currently, attention data flows in one direction — from user to platform — and is monetised without the user's knowledge or benefit. An attention instrument that keeps the user in control inverts the power dynamic.

This is speculative, but the direction is clear: attention data is already one of the most valuable commodities on the internet. The only thing missing is the owner's seat at the table.

## Relation to the layer model

Each layer in the [AI layers vision](ai-layers.md#layer-model) adds resolution to the attention signal — and each layer's data belongs to the reader. The touchpoints:

- **L0** — pull cadence is the most basic signal: "I'm ready for more." Its timing encodes reading pace.
- **L1** — direct viewport-time measurement (live).
- **L2** — explicit annotation layered on top of implicit attention.
- **L3** — model-side entropy/surprisal contextualises what the reader was looking at.
- **L5** — accumulated attention becomes a model of the reader — owned and controlled by them.
- **L6** — the system responds to attention in real time, adjusting delivery to engagement.
