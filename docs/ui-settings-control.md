# Settings panel

*UI spec for the settings flyout. See [design philosophy](design-philosophy.md) for principles, [architecture plan](architecture-plan.md) for component boundaries.*

Cog icon (top-right) opens a flyout panel with live controls. All changes apply immediately.

## Layout

```
                                    ┌───┐
                                    │ ⚙ │  ← cog button, fixed top-right
                                    └─┬─┘
                                      │
                          ┌───────────┴───────────┐
                          │                        │
                          │  Theme       dark ○ ●  │
                          │  Markup       raw ○ ●  │
                          │                        │
                          │  ───────────────────── │
                          │                        │
                          │  Pace          33 tps  │
                          │  ●─────────────────○   │
                          │                        │
                          │  Gap              33%  │
                          │  ●─────────────────○   │
                          │                        │
                          │  ───────────────────── │
                          │                        │
                          │  Justify text    ○     │  locked
                          │  Soft wrap       ●     │  locked
                          │  Auto-advance    ○     │  locked
                          │                        │
                          └────────────────────────┘
```

## Controls

### Toggles (on/off)

**Theme** — `dark` / `light`. Respects system preference on initial load.

**Markup** — `raw` / `rich`. Raw shows per-token spans and whitespace as-is. Rich runs markdown renderer.

### Sliders (continuous, quadratic scaling)

Both sliders use quadratic curve mapping (t -> t^2) so the bottom half of the slider range gives fine control at the sensitive low end.

**Pace** — Stream speed in tokens per second. Range: 5-300 tps. Default: 33. At the low end (5-30), individual word arrival is distinct; at the high end, text appears near-instantly.

**Gap** — Where the growth edge sits in the viewport, as a fraction of viewport height. Range: 15-66%. Default: 33%. Controls three things from one value:
- Pull threshold: how much gap triggers the next block
- Scroll-to-tip target: where content lands after a pull (complement: 1 - gap)
- Timeline padding: CSS `--gap` property ensures enough scrollable space

### Locked (not yet implemented)

**Justify text** — CSS `text-align: justify` on blocks.

**Soft wrap** — Whether blocks preserve internal newlines (pre-wrap) or reflow (normal).

**Auto-advance** — Deferred pending broader feature priority discussion. This is a mode shift (pull-driven becomes push-driven) that needs more design thought.

## Interaction

- **Open**: click cog icon
- **Close**: click cog again, or click/tap outside panel
- **Position**: panel extends from the cog's inside edge toward viewport centre
- **Scrolling**: panel has max-height with overflow-y auto
- **Live**: all changes apply immediately, no confirm/apply step

## Remaining work

- Locked/disabled controls (justify, soft wrap, auto-advance)
- localStorage persistence for all settings across page loads

## Open questions

- Should the status bar (`#status`) also move into or near the panel?
- Keyboard shortcut to toggle panel? (`s` for settings, or `Escape` to close?)
