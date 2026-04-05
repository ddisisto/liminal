# What you're looking at

This page isn't finished. Not because it's loading — because it's a conversation, and a conversation is only as long as it's been so far. The next piece arrives when you scroll down.

Try zooming the page (Ctrl +/- on desktop, pinch on mobile). The text reflows, but the relationship between blocks stays consistent. Newer content is larger. Older content has receded. Zoom works with that, not against it — because in an ongoing conversation, the current exchange matters most.

## The pull

By now you've done it several times without thinking about it. Scroll to the bottom, get the next piece. It's a small inversion — instead of everything arriving at once, you set the pace. The rhythm of your reading becomes part of the interface.

This isn't lazy loading or infinite scroll. There's no buffer waiting offscreen. Each paragraph appears in response to a specific gesture: you, at the bottom edge, asking for more. That request is a signal. It says "I'm ready" — and the *timing* of that signal says something about how you're engaging with what came before.

## What you're feeling

Notice the text getting smaller as you read further? That's not a bug. New content arrives large because it's the focus of attention right now. Earlier content is still there, still readable, but it's visually receding — the way a conversation from an hour ago is still in memory but no longer foreground.

This is a first approximation of temporal distance. In a live conversation, it means the most recent exchange always has visual priority, without pushing history out of reach.

## How it's built

Every word on this page is individually measured and placed by [Pretext.js](https://github.com/chenglou/pretext), a library for precise text layout in the browser. Not a paragraph styled with CSS — each token is its own element, positioned with sub-character accuracy. This gives us per-word addressability: any token can be styled, tracked, or annotated independently.

That level of resolution is what makes the rest possible. When every word is individually addressable, font size can respond to context, reading patterns become measurable at the word level, and the document can reflect its own history. Text on the web has traditionally been a black box at the layout level. You can style it, but you can't truly *instrument* it — not at the resolution where reading actually happens.

## Why this matters beyond chat

The obvious application is conversational AI — a model that generates at the reader's pace rather than dumping everything at once. But the pull mechanic and per-token rendering are interesting on their own. Consider:

**Long-form reading.** An article that reveals itself paragraph by paragraph, tracking where readers slow down, re-read, or abandon. Not for surveillance — for the author. Where did the argument lose people? Where did they lean in?

**Adaptive pacing.** Dense material could slow its own delivery. A technical explanation might arrive one clause at a time; a narrative passage might flow in longer blocks. Your pull cadence tells the system what density you're comfortable with — without asking.

**Typography as interface.** When every token is addressable, size, weight, colour, and spacing can all respond to context. Frequently re-read passages could gain visual weight. The document becomes a heat map of its own reading history.

## What you're experiencing now

Try scrolling back up. Everything is still there, still addressable, still carrying its temporal weight. This is a timeline, not a feed.

This is a proof of concept. The content is static — these are prewritten paragraphs, not live inference. The streaming animation is simulated. But the mechanics are real: per-token rendering via Pretext, pull-driven pacing, context-weight font scaling, and attention tracking that's already recording which blocks hold your gaze.

## What's next

The ideas get more interesting from here. The project docs below explore attention capture, entropy overlays, semantic zoom, and the dynamics of interaction between reader and text — whether that text comes from a model, an author, or an algorithm. But the foundation is what you're already using: text that knows it's being read.

Scroll when you're ready.
