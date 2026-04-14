# Liminal — Design Philosophy

**The reading instrument: principles that precede and are independent of any AI layer.**

---

## The Core Observation

A conversation isn't finished. An article being read isn't finished. Any text that a reader is actively engaged with is, by definition, incomplete — the reading is still in progress, and the reader's relationship with the content is still forming.

Every existing text medium ignores this. Web pages pretend they're finished. Feeds pretend there's always more. PDFs are frozen artifacts. Chat interfaces dump entire responses at once, then wait. None of them represent the actual state of affairs: here is exactly as much as exists so far, here is where you are in it, and the next piece arrives when you're ready.

Liminal starts from this observation and takes it seriously.

---

## Principles

### The reader owns the viewport

The system writes content. The reader decides when and how to look at it. No auto-scrolling, no repositioning, no "helpful" viewport adjustments. The reader's scroll position is sacred — it represents where they actually are, which is the most important piece of state in the entire system.

This is not a convenience feature. It's a foundational constraint. If the system can move the viewport, it can direct attention. If it can direct attention, every other signal the system captures (dwell time, pull cadence, scroll-back) is contaminated by the system's own influence. Viewport ownership is what makes honest attention measurement possible.

### Content arrives when pulled

Text appears in response to reader action, not system initiative. The mechanism is spatial: a gap opens between existing content and the reading position. When the gap is large enough, new content fills it. This works with any input method — wheel, touch, keyboard, scrollbar — because it operates on the spatial relationship between reader and content, not on gesture detection.

The pull cadence is itself a signal. Fast pulls suggest scanning or high engagement. Slow pulls suggest careful reading or disengagement. The system doesn't need to ask "are you paying attention?" — the timing of pulls answers continuously, with paragraph-level granularity, requiring zero additional instrumentation.

### Content signals its own role

Visual presentation derives from intrinsic properties of the content — its length, density, and structure — not from imposed metadata, arrival order, or editorial judgment. Short blocks (questions, headings, key statements) are visually prominent. Long blocks settle into a denser, quieter size that invites sustained reading.

A block's visual weight is determined after its content is complete, not before. During streaming, content arrives at full size — it has maximum claim on attention while it's the active focus. Once complete, it settles to a size proportional to its density. A heading earns its prominence by being short. An explanation earns its density by being long. The scaling is honest because it's derived, not assigned.

This is a specific instance of a broader principle: **the system does not judge content importance.** It lets intrinsic properties determine presentation and lets the reader's behaviour determine significance. Judgment flows from reader to content, not from system to reader.

### The page is as long as the conversation

There is no pre-existing document. The timeline grows as content is created — whether by a model, an author, or the reader themselves. Scrolling back is always available: everything that was written is still there, still addressable, still carrying its visual properties. But there is no illusion of completeness. The bottom of the page is the present moment.

This reframes navigation. "Where am I?" is not a question about a document — it's a question about a process. Bookmarks, resume positions, and scroll-back are not convenience features bolted onto a reading experience. They are the reading experience. The reader's position in the timeline is the primary state of the system.

### The session is the unit of continuity

Walking away and returning should be seamless. The reader's exact position, the content's visual state, the accumulated attention history — all persist. There is no "catching up" or "refreshing." The conversation was paused, not ended, and resuming it is as simple as looking at the screen.

This means the system must treat session state as first-class data. Not just what was written, but where the reader was, what they'd seen, how long they'd spent. The session is not a log of content — it's a record of a reading process.

---

## Relationship to the AI Layers

These principles hold for any text. A static article rendered through this system would still benefit from pull-driven pacing, block-length scaling, viewport ownership, and session persistence. The reading instrument works before any intelligence is added.

The AI layers described in the [AI layers vision](ai-layers.md) build on this foundation:

- **JIT inference** (Layer 0) replaces static content with live generation — but the pull mechanic is the same.
- **Attention capture** (Layer 1) is possible *because* the viewport is reader-owned and the pull cadence is honest — the signals aren't contaminated by system-initiated scrolling.
- **Annotation and overlays** (Layers 2–3) are possible because every token is individually addressable and spatially known.
- **Semantic zoom** (Layer 4) extends the block-length scaling principle: content can compress or expand, and its visual weight adjusts honestly.
- **The user model** (Layers 5–6) is built on accumulated attention data whose integrity depends on every principle above.

The reading instrument is the foundation. The AI layers are what you can build when the foundation is honest.

---

*This document describes principles that emerged from building the system. They were not designed top-down — they were discovered through iteration, and they hold because they match how reading actually works.*
