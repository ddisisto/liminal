# Attention Instrumentation in Browser-Based Reading Interfaces

**Research survey for Liminal -- prior art, tools, technical considerations, and signal validity**

*Compiled April 2026. Sources are a mix of training-data knowledge (marked [TK]) and web search results (marked [WS]). Treat accordingly.*

---

## 1. Academic and Industry Prior Art

### Mouse and Cursor Tracking as Attention Proxies

The foundational work here is **Claypool et al. (2001)**, who built the "Curious Browser" -- a modified web browser that recorded activity from 75 students browsing over 2,500 pages. They found that cursor travel time was a positive indicator of page relevance. Around the same time, **Goecks and Shavlik (2000)** ("Learning users' interests by unobtrusively observing their normal behavior," IUI 2000) trained a neural network on cursor activity to predict user interest variables. [WS: [ACM](https://dl.acm.org/doi/10.1145/3397271.3401031), [IntechOpen](https://www.intechopen.com/chapters/8975)]

This line of work evolved significantly. **Huang, White, and Dumais (2011)** ("Using Cursor Movements to Understand and Improve Search," CHI 2011) showed that mouse cursor position is often aligned with eye gaze on search result pages and can serve as a reasonable gaze proxy. [WS: [PDF](https://jeffhuang.com/papers/CursorBehavior_CHI11.pdf)]

**The Attentive Cursor Dataset** (Leiva and Arapakis, 2020, Frontiers in Human Neuroscience) provides a large-scale dataset pairing cursor movements with attention labels, useful for training models that predict attention from cursor behavior. [WS: [Frontiers](https://www.frontiersin.org/articles/10.3389/fnhum.2020.565664/full)]

**MouseView.js** (Anwyl-Irvine et al., 2021, Behavior Research Methods) takes a different approach: it blurs the display and lets participants move a sharp aperture roughly fovea-sized with the cursor. It produced dwell time results that correlated highly with actual eye-tracking data. Clever, but introduces a non-natural interaction -- not suitable for passive instrumentation. [WS: [Springer](https://link.springer.com/article/10.3758/s13428-021-01703-5)]

### Dwell Time and Reading Time

**Kelly and Belkin (2004)** ("Reading Time, Scrolling and Interaction: Exploring Implicit Sources of User Preferences for Relevance Feedback") is the key paper on using reading time and scroll behavior as implicit feedback. They found that time on page combined with scroll depth had a strong positive correlation with explicit user ratings. However, they also showed that the usefulness of time-as-interest depends heavily on task complexity -- it works better for complex search tasks. [WS: [ResearchGate](https://www.researchgate.net/publication/2563451)]

**Kelly (2005)** ("Implicit Feedback for Inferring User Preference: A Bibliography," SIGIR Forum) provides a comprehensive survey of the field up to that point. The key finding across the literature: reading time distributions have long tails, are not normal, and are full of outliers in natural settings. Time spent examining an object does not necessarily correspond to interest. [WS: [PDF](https://haystack.csail.mit.edu/papers/kelly.sigirforum03.pdf)]

### Eye Tracking and Browser-Based Proxies

**Buscher et al. (2012)** ("Attentive documents: Eye tracking as implicit feedback for information retrieval and beyond," ACM TIIS) demonstrated that eye-tracking data provides richer implicit feedback than clicks alone, but acknowledged the practical barriers to deploying eye tracking at scale. [WS: [ACM](https://dl.acm.org/doi/10.1145/2070719.2070722)]

**WebGazer.js** (Papoutsaki et al., 2016, Brown University) is the most notable attempt to bridge this gap -- a JavaScript library that uses webcam feeds to predict gaze location in the browser. It runs entirely client-side (no video sent to servers), self-calibrates from user interactions, and works in Chrome, Firefox, and Edge. Accuracy is in the range of 100-200px, which is useful for region-level attention but not fine-grained text-level tracking. [WS: [webgazer.cs.brown.edu](https://webgazer.cs.brown.edu/), [GitHub](https://github.com/brownhci/WebGazer)]

**eyeScrollR** (2024, Behavior Research Methods) is an R package that maps eye-tracking gaze coordinates to scrollable web page content by combining gaze data with scroll position data. Relevant to the problem of coordinate remapping in scrollable interfaces. [WS: [Springer](https://link.springer.com/article/10.3758/s13428-024-02343-1)]

### Social Media Dwell Research

**Epstein et al. (2022)** ("Quantifying attention via dwell time and engagement in a social media browsing environment") found that dwell time captures attention exposure and the amount of cognitive "trying," with a minimum threshold of ~150ms below which no meaningful attention is occurring. [WS: [arXiv](https://ar5iv.labs.arxiv.org/html/2209.10464)]

---

## 2. Existing Open-Source Tools and Libraries

### Reading Time Estimators

- **[reading-time](https://github.com/ngryman/reading-time)** (npm) -- Medium-style reading time estimation. Returns minutes, milliseconds, word count. Static estimation, not behavioral. Useful as a baseline expectation against which actual dwell can be compared. [WS]
- **[ReadRemaining.js](https://aerolab.github.io/readremaining.js/)** -- jQuery plugin that estimates remaining reading time based on scroll speed. Interesting because it incorporates actual scroll velocity, not just word count. [WS]

### Interaction Analytics

- **[Scribe Analytics](https://github.com/scribe-analytics/scribe-analytics)** -- Open-source library that tracks "virtually every user interaction possible" including page views, clicks, and element engagements. Broad capture but not specifically designed for reading behavior. [WS]
- **[Analytics](https://getanalytics.io/)** -- Lightweight pluggable analytics abstraction. Good architecture reference for how to design a provider-agnostic event pipeline. [WS]
- **[EventAnalytics.js](http://www.eventanalytics.org/)** -- Notably, version 1.0.1 automatically detects and sends events on text selection. One of the few libraries that treats selection as an analytics event. [WS]

### Commercial Session Replay (Architecture Reference)

- **Hotjar** -- Heatmaps, scroll depth visualization, session replay. Defaults to strict masking of sensitive data. Stores in EU data centers. Their approach to suppressing keyboard input by default and requiring opt-in for form data capture is a good privacy pattern to study. [WS: [Hotjar Privacy](https://www.hotjar.com/blog/hotjar-approach-privacy/)]
- **FullStory** -- More powerful search and retroactive analysis. Frustration detection (rage clicks, dead clicks). Offers granular masking control. [WS]

Both are cloud-hosted SaaS, which is architecturally opposite to Liminal's local-first approach, but their data masking and consent patterns are worth studying.

### Browser-Based Eye Tracking

- **[WebGazer.js](https://github.com/brownhci/WebGazer)** -- As described above. Client-side, webcam-based. Could be an optional enrichment layer for Liminal but adds significant complexity and requires camera permission. [WS]

---

## 3. Technical Considerations and Gotchas

### IntersectionObserver vs. Scroll Listeners

IntersectionObserver is the right primitive for dwell time measurement. Performance benchmarks show it uses roughly 23% of the scripting time that scroll listeners with throttling require. It fires asynchronously, off the main thread, and only when there is new intersection data -- no continuous polling. Callbacks receive batched `IntersectionObserverEntry` objects ordered by generation time. [WS: [DEV](https://dev.to/jenc/a-stab-at-performance-testing-with-intersection-observer-and-scroll-events-173k), [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)]

For Liminal specifically: observe each message block or paragraph element with threshold steps (e.g., `[0, 0.25, 0.5, 0.75, 1.0]`). Combine visibility ratio with time to compute weighted dwell. This is cheap and reliable.

### Passive Event Listeners

For scroll and touch events, always use `{ passive: true }`. This tells the browser you will not call `preventDefault()`, allowing it to optimize scroll performance immediately rather than waiting for your handler. Chrome enforces this for touch/wheel events on `document`-level listeners. [WS: [OpenReplay](https://blog.openreplay.com/handling-scroll-events-performance/)]

### Selection API Limitations

Several non-obvious gotchas:

- **`selectionchange` fires on `document`, not on individual elements.** You cannot scope it. Every selection change anywhere in the document triggers it. You need to filter by checking whether the selection falls within your content area. [WS: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/selectionchange_event)]
- **`selectionchange` is not cancelable and does not bubble.** You must listen on `document` directly. [WS]
- **Multi-range selection is Firefox-only.** All other browsers support at most one range. For Liminal this is fine -- users select one span at a time. [WS: [javascript.info](https://javascript.info/selection-range)]
- **Safari and Chrome focus the element containing a programmatic selection**, Firefox does not. Relevant if you ever need to set selections programmatically. [WS]
- **Mobile behavior varies significantly.** Touch-based selection triggers different events and timing. The selection handle UI is OS-controlled and may fire `selectionchange` at different moments than desktop. Test on actual mobile devices. [TK]
- **`selectionchange` fires frequently during drag-select** -- every pixel of movement generates an event. Debounce or only capture on `mouseup`/`selectionchange` after a quiet period. [TK]

### Clipboard API

The `copy` event fires on the element that has focus/selection when the user triggers copy. It is reliable across browsers. The main gotcha: `navigator.clipboard.readText()` requires explicit permission and is async. For Liminal, you only need to listen for the `copy` event (not read clipboard contents), which requires no permission. You can read `window.getSelection().toString()` at the time of the copy event to know what was copied. [TK]

### Event Batching Strategy

The architecture doc already specifies batching at a configurable interval. Practical recommendations:

- **Batch window: 2-5 seconds** for normal operation. Shorter adds network overhead; longer risks data loss on tab close.
- **Use `navigator.sendBeacon()`** on `visibilitychange` and `beforeunload` to flush the final batch. `sendBeacon` is fire-and-forget and survives page unload, unlike `fetch`. [TK]
- **Deduplicate selection events** in the batch. A user dragging a selection generates many intermediate `selectionchange` events. Only the final selection (after a debounce quiet period of ~300ms) should be recorded as a selection event. [TK]
- **Timestamp on the client, not the server.** These events are about user-time, not server-receive-time. Use `performance.now()` for relative timing within a session, `Date.now()` for absolute timestamps. [TK]

---

## 4. Signal Validity -- What the Research Actually Says

### Dwell Time

**Moderately valid, with caveats.** The Kelly and Belkin work established that dwell time + scroll depth correlates with explicit relevance ratings, but the relationship is task-dependent and non-linear. Epstein et al. confirmed the minimum threshold (~150ms) below which dwell is noise. The fundamental problem: long dwell can mean deep engagement, confusion, or the user left the tab open while getting coffee. [WS, TK]

**For Liminal:** Dwell is more useful in a chat interface than in web search because the content is linear and the user is likely engaged with the visible portion. Combining dwell with scroll direction (re-reading = scrolling back up) and visibility ratio (IntersectionObserver) produces a much more reliable signal than dwell alone.

### Selection as Interest Signal

**High signal-to-noise, but sparse.** No large-scale study specifically validates text selection as an interest proxy, but the implicit feedback literature consistently finds that higher-effort interactions are more reliable signals. Selection requires deliberate motor action -- it is categorically different from passive dwell. The research on behavioral signal differentiation (Google Research on user profiling) confirms that effort-weighted signals are more accurate indicators of genuine interest. [WS: [Google Research](https://research.google/pubs/improving-user-topic-interest-profiles-by-behavior-factorization/)]

**For Liminal:** Selection is likely the single most reliable signal the system captures. The challenge is that it is sparse -- most reading produces no selection events. This is a feature, not a bug: sparse high-signal events are more useful than continuous noisy ones.

### Copy as Interest Signal

**Very high signal, very sparse.** Copy is selection + an additional deliberate action. If someone copies text from an AI response, they almost certainly found it valuable enough to use elsewhere. This is arguably the strongest implicit signal available without explicit annotation. [TK]

### Scroll Behavior

**Useful in aggregate, noisy per-event.** Scroll-back (returning to previously read content) is a stronger signal than scroll-forward (which is just normal reading progression). Scroll velocity can indicate skimming vs. careful reading. The readremaining.js approach of tracking scroll speed is directionally correct. [TK]

### Mouse Position (Without Clicking)

**Weak signal in isolation, useful combined.** The Huang et al. finding that cursor aligns with gaze holds primarily on search result pages. In a reading interface with longer text, cursor-gaze alignment degrades -- many users park their cursor away from the text while reading. Not recommended as a primary signal for Liminal. [TK]

---

## 5. Considerations Specific to Liminal's Chat/Document Interface

### Token-Level Resolution

Liminal's architecture maps attention events to token positions, not DOM elements or pixel coordinates. This is unusual and powerful -- most analytics tools work at the element or page level. The key implementation challenge: maintaining a reliable mapping between rendered DOM positions and token indices as the conversation grows, especially during streaming. Pretext.js addresses this for spatial measurement, but the token-position lookup needs to be fast (events fire frequently) and stable (the DOM changes during streaming). [TK, based on architecture doc]

### Streaming Complicates Everything

During active generation, new tokens are being appended to the DOM while the user may be reading, selecting, or scrolling in already-rendered content. The attention capture system must:

- Not block or interfere with rendering
- Correctly resolve token positions even as the DOM grows
- Handle the case where a user selects text that spans a boundary between already-rendered and still-streaming content

This is not addressed in any of the prior art surveyed -- it is specific to streaming chat interfaces. [TK]

### JIT Inference Cadence as Primary Attention Signal

The architecture's JIT inference model (generation pulled by the user one paragraph at a time via stop conditions) means the core interaction loop *is* the primary attention instrument. The interval between token stream completion and the user's next pull request is a direct, high-reliability measure of paragraph-level dwell — analogous to how reading researchers use page-turn latency as a signal. This requires no additional instrumentation; it falls out of the generation protocol itself. All other attention signals (selection, copy, scroll-back) are enrichment layers on top of this foundation. [TK, updated based on architecture revision]

### Privacy Model is Simpler Than Commercial Tools

Because Liminal is single-user and local-first, most of the GDPR/consent machinery that Hotjar and FullStory require is irrelevant. The user is instrumenting their own reading behavior for their own analysis. However, if the data ever feeds back into model training or is shared, the privacy model changes dramatically. The architecture doc is right to defer this. [TK]

### What to Prioritize for Implementation

Revised priority based on the JIT inference model (see architecture doc). The key insight: if generation is pulled by the user one paragraph at a time, the pull cadence itself is the highest-signal attention data — paragraph-level dwell with near-perfect reliability and zero instrumentation overhead.

1. **JIT inference cadence** -- The interval between the end of a token stream and the user's next pull request is a direct measure of paragraph-level dwell. If the user pulls faster than plausible reading speed, that's a skim/search signal. If they dwell, that's engagement. This comes for free from the core interaction loop — no additional capture code needed.
2. **Copy events** -- Highest explicit signal, trivial to implement. Just listen for `copy` on the document, resolve selection to token range.
3. **Selection events** -- High signal, slightly more complex due to debouncing and `selectionchange` noise. Capture only settled selections (300ms debounce after last `selectionchange`).
4. **Scroll-back detection** -- Moderate signal, moderate complexity. Track scroll direction relative to content already marked as "seen." Scrolling up into previously viewed content is a re-reading signal.
5. **Dwell time via IntersectionObserver** -- Enrichment layer on top of the JIT cadence signal. Useful for measuring attention on *previous* paragraphs while the user is reading current content.
6. **Scroll velocity** -- Low-moderate signal, useful for distinguishing skimming from reading. Derive from scroll event timestamps and positions.

Mouse position tracking is not recommended as a primary signal for this use case.

---

## Key References

- Claypool, M. et al. (2001). "Implicit interest indicators." IUI 2001. [TK]
- Goecks, J. and Shavlik, J. (2000). "Learning users' interests by unobtrusively observing their normal behavior." IUI 2000. [TK]
- Huang, J., White, R., Dumais, S. (2011). "No clicks, no problem: Using cursor movements to understand and improve search." CHI 2011. [WS: [PDF](https://jeffhuang.com/papers/CursorBehavior_CHI11.pdf)]
- Kelly, D. and Belkin, N.J. (2004). "Reading time, scrolling and interaction: Exploring implicit sources of user preferences for relevance feedback." SIGIR 2004. [WS: [ResearchGate](https://www.researchgate.net/publication/2563451)]
- Kelly, D. (2005). "Implicit Feedback for Inferring User Preference: A Bibliography." SIGIR Forum. [WS: [PDF](https://haystack.csail.mit.edu/papers/kelly.sigirforum03.pdf)]
- Buscher, G. et al. (2012). "Attentive documents: Eye tracking as implicit feedback for information retrieval and beyond." ACM TIIS 1(2). [WS: [ACM](https://dl.acm.org/doi/10.1145/2070719.2070722)]
- Papoutsaki, A. et al. (2016). "WebGazer.js: Scalable webcam eye tracking using user interactions." IJCAI 2016. [WS: [webgazer.cs.brown.edu](https://webgazer.cs.brown.edu/)]
- Leiva, L.A. and Arapakis, I. (2020). "The Attentive Cursor Dataset." Frontiers in Human Neuroscience. [WS: [Frontiers](https://www.frontiersin.org/articles/10.3389/fnhum.2020.565664/full)]
- Anwyl-Irvine, A. et al. (2021). "MouseView.js: Reliable and valid attention tracking in web-based experiments." Behavior Research Methods. [WS: [Springer](https://link.springer.com/article/10.3758/s13428-021-01703-5)]
- Epstein, Z. et al. (2022). "Quantifying attention via dwell time and engagement in a social media browsing environment." [WS: [arXiv](https://ar5iv.labs.arxiv.org/html/2209.10464)]
- Google Research. "Improving User Topic Interest Profiles by Behavior Factorization." [WS: [Google Research](https://research.google/pubs/improving-user-topic-interest-profiles-by-behavior-factorization/)]

---

*This document is a research input, not a specification. Implementation details should be validated against current browser documentation and tested against actual user behavior in the Liminal interface.*
