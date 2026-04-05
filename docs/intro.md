# What you're looking at

## The rendering

Every word you're reading is a discrete DOM element. Not a text node split after the fact — each token was measured, placed, and rendered individually by [Pretext.js](https://github.com/chenglou/pretext), a new library for precise text layout in the browser. Pretext gives us sub-character positioning, accurate line-break prediction, and per-token addressability with none of the usual measurement hacks (hidden divs, canvas fallbacks, range API gymnastics). It's the kind of foundation you can build real typographic tooling on.

This matters because text on the web has always been a black box at the layout level. You can style it, but you can't truly *instrument* it — not at the resolution where reading actually happens, token by token, word by word. Pretext changes that. And once you can instrument text, you can start asking better questions about how people actually engage with it.

## The pull

You've already noticed: this page doesn't load all at once. You scroll down, content appears. That's not lazy loading — it's a deliberate inversion. Instead of pushing a wall of text at you, the interface lets you *pull* the next piece when you're ready. One scroll at the bottom edge, one new paragraph.

This is a small thing that changes everything. The reader sets the pace. The rhythm of arrival becomes meaningful — not just "how fast can we render" but "when did the reader actually want more." That interval is a signal. It's attention made visible.

## Why this matters beyond chat

The obvious application is conversational AI — a model that generates text at the reader's pace rather than dumping it all at once. But the pull mechanic and per-token rendering are interesting independent of any model. Consider:

**Long-form reading.** An article that reveals itself paragraph by paragraph, tracking where readers slow down, re-read, or abandon. Not for surveillance — for the author. Where did the argument lose people? Where did they lean in?

**A/B testing at token resolution.** Not "which headline got more clicks" but "which *sentence* held attention, which transition lost it, which paragraph earned the next scroll." The difference between page-level analytics and token-level instrumentation is the difference between knowing someone left and knowing *why*.

**Adaptive pacing.** Dense material could slow its own delivery. A technical explanation might arrive one clause at a time; a narrative passage might flow in longer blocks. The reader's pull cadence tells you what density they're comfortable with — without asking.

**Typography as interface.** When every token is addressable, font size, weight, color, and spacing can all respond to context. Text that was written an hour ago can look different from text written a minute ago. Frequently re-read passages can gain visual weight. The document becomes a heat map of its own reading history.

## What you're experiencing now

This is a proof of concept. The content is static (these are prewritten paragraphs, not live inference). The streaming animation is simulated. But the mechanics are real: per-token rendering via Pretext, JIT pull on scroll, context-weight font scaling (notice how earlier blocks have smaller text as more content accumulates — recency has visual weight).

The text shrinking isn't decorative. It's a first approximation of temporal distance. New content is large because it's the focus of attention *right now*. Older content is still there, still readable, but it's receding — the way yesterday's conversation is still in memory but no longer foreground.

Try scrolling back up. Everything is still there, still per-token-addressed. This is a timeline, not a feed.

## What's next

The ideas get more interesting from here. The project docs below explore attention capture, entropy overlays, semantic zoom, and the dynamics of interaction between reader and text — whether that text comes from a model, an author, or an algorithm. But the foundation is what you're already using: text that knows it's being read.

Scroll when you're ready.
