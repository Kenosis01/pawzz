# Design system

The visual language lives in one file: `src/styles/tokens.css`. Everything else
consumes it — component CSS Modules reference `var(--token)`, and the widget
frame republishes a subset to model-generated code.

There is **no component kit**. Tailwind v4 is wired through `postcss.config.js`,
but the app styles with CSS Modules plus tokens; if you add a utility class,
expect it to be the exception.

## How a style is applied

1. A token is defined in `src/styles/tokens.css` under `:root` (light) and
   `.dark` (dark).
2. A component imports its own module, e.g. `import styles from "./X.module.css"`,
   and the rule references tokens: `color: var(--foreground);`.
3. The same file may read `--palette-N` only if it is inside a widget; the app
   itself uses the interface palette.

## Theme switching

- The `dark` class is applied to `<html>`.
- `src/app/layout.tsx` injects `THEME_BOOTSTRAP`, an inline script that resolves
  the stored preference **before first paint**, so the window never flashes the
  wrong surface. `suppressHydrationWarning` is set on `<html>` because that script
  mutates the class before React takes over.
- `src/lib/theme.ts` resolves the same thing at runtime, including live OS
  changes when the preference is `system`.
- **If you touch one, touch the other.** They encode the same decision.

## Colour tokens

### Surfaces and text

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--background` | `#f8f7f3` | `#151515` | the app canvas |
| `--surface` | `#fcfbf8` | `#201f1e` | a raised panel |
| `--surface-elevated` | `#ffffff` | `#262523` | an overlay / popover surface |
| `--surface-subtle` | `#f3f1ec` | `#1b1a19` | one step off the canvas |
| `--foreground` | `#191714` | `#f5f3ee` | primary text |
| `--foreground-secondary` | `#45413b` | `#d6d2ca` | secondary text |
| `--foreground-display` | `#191714` | `#f0efec` | large display type |
| `--muted-foreground` | `#716d65` | `#a5a099` | metadata |
| `--placeholder` | `#9b968d` | `#7d7871` | placeholder text |
| `--foreground-inverse` | `#fcfbf8` | `#191714` | text on a `--foreground` fill |

### Borders, accents, status

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--border` | `#e7e3dc` | `#3a3835` | default border |
| `--border-subtle` | `#eeebe3` | `#302e2b` | hairline |
| `--border-strong` | `#d9d4cb` | `#4a4744` | visible edge, scrollbar |
| `--accent` | `#c9785b` | `#d0896c` | brand accent, focus ring |
| `--accent-hover` | `#d58a6c` | `#dd9a80` | accent hover |
| `--accent-soft` | `#f1ddd4` | `#3d2a22` | accent tint |
| `--accent-foreground` | `#ffffff` | `#1c1b19` | text on accent |
| `--success` | `#5c806a` | `#7ba389` | positive |
| `--warning` | `#a57a45` | `#c39a63` | caution |
| `--danger` | `#b85c57` | `#d17772` | danger **text** |
| `--danger-fill` | `#c33d31` | `#c0453e` | danger **background** |
| `--danger-fill-hover` | `#ad3328` | `#d0524a` | danger background, hover |
| `--danger-fill-foreground` | `#ffffff` | `#fcfbf8` | text on danger fill |
| `--info` | `#667b91` | `#8299b1` | informational |

`--danger` and `--danger-fill` are deliberately separate: the text value is tuned
for legibility on a surface, and reads as a muddy chip when used as a fill.

### Sidebar, code, material

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--sidebar` | `#f4f2ed` | `#111111` | sidebar base |
| `--sidebar-hover` | `#ece9e2` | `#1c1b1a` | sidebar row hover |
| `--sidebar-active` | `#e7e3dc` | `#262523` | sidebar row active |
| `--code-background` | `#f0eee9` | `#1a1917` | code blocks |
| `--material` | `rgb(250 249 246 / .72)` | `rgb(35 34 33 / .72)` | translucent panel |
| `--material-border` | `rgb(0 0 0 / .08)` | `rgb(255 255 255 / .09)` | its edge |
| `--material-blur` | `saturate(180%) blur(20px)` | same | backdrop filter |

### Syntax

Syntax highlighting has **its own six-hue palette**, used only inside code
blocks. The interface palette cannot do the job: it has one accent and four
status colours, which would put keywords, strings, numbers and types on
near-identical hues.

| Token | Light | Dark |
| --- | --- | --- |
| `--syntax-comment` | `#6f6a61` | `#8d8779` |
| `--syntax-keyword` | `#8f3a63` | `#e08cb8` |
| `--syntax-string` | `#2f6b46` | `#85c99c` |
| `--syntax-number` | `#8a5310` | `#e0b264` |
| `--syntax-func` | `#2a5a86` | `#7fb6e6` |
| `--syntax-type` | `#8a3a25` | `#e69878` |
| `--syntax-const` | `#63468a` | `#b295e2` |
| `--syntax-punct` | `#4a463f` | `#a5a099` |

Highlights are produced by `rehype-highlight`, whose default theme maps onto
these classes (see `src/components/chat/Markdown.module.css`).

## Typography

### Families

| Token | Resolves to | Use |
| --- | --- | --- |
| `--font-sans` | Geist Sans, then the platform UI face | the interface |
| `--font-mono` | Geist Mono, then the platform mono | code |
| `--font-editorial` | `var(--font-cormorant)` (Cormorant Garamond), then Georgia | the wordmark and large display lines |
| `--font-display` | the platform's display cut | large one-off lines (the greeting) |
| `--font-response` | `var(--font-response)` (Source Serif 4) | assistant replies |

All three webfaces are loaded through `next/font/google` in `src/app/layout.tsx`,
which subsets and self-hosts them at build time. `src/styles/fonts.css` exists
only to record that no bundled font files are shipped.

**Weights are listed explicitly, not left variable**, because an unlisted weight
is *synthesised* by the browser — a synthesised bold inside a serif paragraph is a
different typeface, which reads as a rendering bug. If a reply needs a weight,
load it.

### Sizes, leading

| Token | Value | Use |
| --- | --- | --- |
| `--text-page` | 30px | page title |
| `--text-section` | 22px | section heading |
| `--text-subsection` | 17px | sub-heading |
| `--text-chat` | 16px | transcript body |
| `--text-body` | 15px | default UI text |
| `--text-small` | 13px | secondary |
| `--text-caption` | 12px | captions, metadata |
| `--text-code` | 13px | code |
| `--text-brand` | 21px | wordmark |
| `--leading-body` | 1.55 | body |
| `--leading-tight` | 1.3 | headings |

## Spacing, radius, motion

- **Spacing** — a 4px grid: `--space-1` (4px) through `--space-16` (64px):
  1, 2, 3, 4, 5, 6, 8, 10, 12, 16 → 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- **Radius** — `--radius-sm` 8, `--radius-md` 12, `--radius-lg` 16,
  `--radius-xl` 20, `--radius-composer` 22.
- **Motion** — `--ease-standard` `cubic-bezier(0.2, 0, 0, 1)`;
  `--duration-micro` 140 ms, `--duration-normal` 220 ms,
  `--duration-workspace` 360 ms.
- **Reduced motion** is honoured globally in `global.css`: every animation and
  transition is reduced to `0.01ms`.

## Layout tokens

| Token | Value |
| --- | --- |
| `--sidebar-width` | 260px (default) |
| `--sidebar-width-collapsed` | 68px |
| `--workbench-width` | 480px |
| `--reading-width` | 780px — the transcript measure and the widget frame width |
| `--composer-width` | 720px |

## Depth and z-index

Shadows are a hairline hierarchy, never a floating card with a large shadow:

- `--shadow-window`, `--shadow-raised`, `--shadow-popover`
- `--focus-ring` — `0 0 0 3px color-mix(in srgb, var(--accent) 40%, transparent)`

The focus ring resolves against whichever `--accent` is active, so it needs a
value in only one place.

Z-index ladder: `--z-base` 0, `--z-sticky` 100, `--z-sidebar` 200,
`--z-workbench` 300, `--z-overlay` 400, `--z-modal` 500, `--z-toast` 600.

## Global element rules (`global.css`)

- `box-sizing: border-box` everywhere; `html, body` are `height: 100%`.
- Buttons and inputs inherit font, colour and background; buttons are reset to
  `cursor: pointer`.
- **Focus**: `:focus-visible` on non-text controls gets the focus ring; text
  fields get a caret and no halo, because a ring around a textarea fights the
  text inside it. Their container shows focus instead.
- `button:active` dims to `opacity: 0.7` — press feedback, never a bounce.
- **Overlay scrollbars**: transparent until the region is hovered or focused.
- `body[data-resizing]` sets `cursor: col-resize` and `user-select: none` while a
  panel edge is being dragged.

## Widgets and the palette

The widget frame (`src/lib/widget.ts`) republishes a subset of tokens
(`--fg`, `--fg-muted`, `--surface`, `--border-token`, `--accent-token`) read live
from `document.documentElement`, plus the categorical palette as
`--palette-1…8`:

```
1 #2a78d6 blue · 2 #eb6834 orange · 3 #1baf7a aqua · 4 #eda100 yellow
5 #e87ba4 magenta · 6 #008300 green · 7 #6250d6 violet · 8 #e34948 red
```

The order is the point: a categorical scale is only readable if the same category
is the same colour in every chart of a conversation, and that only holds if the
order is fixed. Chart.js cannot read CSS variables (a canvas has no cascade), so
the model is told to hardcode the hex for canvas and use the variables for HTML.

Token values interpolated into the widget document are sanitised
(`sanitiseToken` in `src/lib/widget.ts`) before they are written into a `<style>`
block.

## Changing the look

1. Change a token in `src/styles/tokens.css` — both themes, in the same edit.
2. If you add a token, give it a value in `:root` **and** `.dark`.
3. If it is one a widget could reasonably need, add it to `readHostTokens` in
   `src/lib/widget.ts` and to the widget's `THEME_CSS` mapping.
4. Check the change in both themes and at the sidebar's minimum width (200px).