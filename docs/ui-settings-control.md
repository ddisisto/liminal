# Settings panel

Replace the exposed control buttons with a single cog icon that opens a flyout panel.

## Current state

Four fixed-position elements:
- Top-right: `dark`/`light` button, `raw`/`rendered` button (`.controls` div)
- Right edge: `▲` nav-top (below controls), `▼` nav-end (above input)

Hardcoded values that should become user-adjustable:
- `tokensPerSecond: 60` (main.ts) — stream pacing
- `PULL_GAP_THRESHOLD: 200` px (viewport.ts) — how far past the tip triggers a pull

## Layout

```
                                    ┌───┐
                                    │ ⚙ │  ← cog button, fixed top-right
                                    └─┬─┘
                                      │
                          ┌───────────┴───────────┐
                          │  Settings              │
                          │                        │
                          │  Theme       dark ○ ●  │
                          │  Markup       raw ○ ●  │
                          │                        │
                          │  ───────────────────── │
                          │                        │
                          │  Pace     ●────────○   │
                          │           slow   fast   │
                          │                        │
                          │  Tip position          │
                          │           ●────────○   │
                          │           high    low   │
                          │                        │
                          │  ───────────────────── │
                          │                        │
                          │  Justify text    ○     │
                          │  Soft wrap       ●     │
                          │  Auto-advance    ○     │
                          │                        │
                          └────────────────────────┘

          ▲  nav-top                        (unchanged, sits behind panel when open)

                    content area

          ▼  nav-end                        (unchanged)
```

## Controls

### Toggles (on/off)

**Theme** — `dark` / `light`. Currently working. Migrates into panel, same behaviour.

**Markup** — `raw` / `rich`. Currently "rendered" — rename. Raw shows per-token spans and whitespace as-is. Rich runs markdown renderer. Migrates into panel, same behaviour.

**Justify text** — CSS `text-align: justify` on blocks. Off by default. New.

**Soft wrap** — Whether blocks preserve internal newlines (pre-wrap) or reflow (normal). On by default (reflow). New — current behaviour is pre-wrap for raw, normal for rendered; this gives explicit control.

**Auto-advance** — Automatically pulls next block after the current one finishes streaming, using the current pace setting as the delay between blocks. Off by default. New. This is a mode shift — pull-driven becomes push-driven. Consider visual indicator when active (e.g. pulsing pull indicator).

### Sliders (continuous)

**Pace** — Controls `tokensPerSecond`. Range: ~10 (deliberate, word-by-word) to ~200 (near-instant). Default: 60. Single control rather than separate speed + acceleration — acceleration is interesting but adds complexity before the base control exists.

**Tip position** — Where in the viewport new content appears, as a proportion. Range: ~0.3 (high, content appears near top third) to ~0.8 (low, near bottom). Default: ~0.67 (current 2/3 position). Maps to the scroll-to-tip target in viewport.ts. Units: proportion of viewport height (not px — must be resolution-independent).

## Interaction

- **Open**: click cog icon
- **Close**: click cog again, or click/tap outside panel
- **Position**: panel extends from the cog's inside edge toward viewport centre — doesn't cover the cog itself
- **Scrolling**: panel has max-height with overflow-y auto, so it scales as controls are added
- **Persistence**: settings stored in localStorage, restored on load
- **Live**: all changes apply immediately, no confirm/apply step

## Implementation

Unimplemented controls are present in the panel but visually locked (disabled/greyed). This shows the full surface area and signals what's coming, without hiding controls or changing layout later.

**Auto-advance** is deferred pending broader feature priority discussion — it's a mode shift that needs more design thought. Include it locked with a brief label like "coming soon" or just greyed out.

### Steps

1. Build cog + flyout shell, empty panel
2. Move theme and markup toggles into panel, remove old buttons
3. Add pace slider (wire to tokensPerSecond)
4. Add tip position slider (wire to scrollToTip target)
5. Add justify, soft wrap, auto-advance toggles (locked/disabled)
6. localStorage persistence

Nav buttons (▲ ▼) stay where they are — they're navigation, not settings.

## Open questions

- Should the status bar (`#status`) also move into or near the panel?
- Keyboard shortcut to toggle panel? (`s` for settings, or `Escape` to close?)
- Should auto-advance have its own speed control, or reuse the pace slider?
