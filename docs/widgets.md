# Widgets

The feature that makes Pawzz more than a text box: the model can draw.

It cannot emit pixels. It calls one tool, `show_widget`, with an HTML or SVG
fragment, and the client renders that fragment inside a sandboxed frame. This
document covers the whole pipeline and, more importantly, the security model that
makes running model-written code acceptable.

## Files

| File | Role |
| --- | --- |
| `src/lib/widget-tools.ts` | the tool schema, the tool map, and the model's entire system prompt |
| `src/lib/widget.ts` | `buildWidgetDocument` — wraps a fragment into a full document; the CSP; the runtime injected into the frame |
| `src/components/chat/Widget.tsx` | the host side: the sandboxed iframe, height fitting, export, error display |
| `src/lib/chat-messages.ts` | turns tool-call parts into `MessageBlock`s in stream order |
| `src/state/conversation.tsx` | `MessageWidget` / `MessageBlock` storage shapes |

## The contract

One tool, not one per output format (`widget-tools.ts`):

```ts
show_widget({
  title: string,            // snake_case identifier, shown as the frame label
  widget_code: string,      // the fragment
  loading_messages?: string[] // 1–4 messages shown while it renders
})
```

`execute` returns a short acknowledgement and **nothing else**. That is what
keeps the widget payload out of the model's context: it is told the visual is on
screen, which is the only fact it needs to write the takeaway that follows.

`WIDGET_SYSTEM_PROMPT` is the tool's real specification. It names the allowed
CDN hosts, the pinned library versions, the three.js pitfalls, the palette, the
SVG rules and the code format. If you change what a widget may do, change the
prompt — there is no renderer the model can inspect and no error it can read.

## Rendering pipeline

```
tool call part (state: input-streaming)   → { kind: "widget", pending: true }
tool call part (state: input-available)   → { kind: "widget", widget: {...} }
```

A call whose arguments are still arriving becomes a **skeleton** block, so the
placeholder appears *where the chart will be* rather than at the end of the
reply. The partial code is deliberately not rendered: rebuilding the document on
each character would restart the frame's animation continuously.

Blocks preserve the order the model produced them. Prose and visuals share one
sequence, because "all the text, then all the pictures" moves a chart below the
conclusion it was evidence for.

## The security model

This is the part to read before changing anything here.

### 1. The frame has no origin

```jsx
<iframe srcDoc={source} sandbox="allow-scripts" referrerPolicy="no-referrer" />
```

`allow-scripts` **without** `allow-same-origin`. The document therefore sits on
an **opaque origin**: it cannot read the parent's cookies, `localStorage`, or
DOM. `allow-forms` and `allow-popups` are also absent, so the only capability
granted is running the script the model wrote.

Adding `allow-same-origin` would hand every generated widget the app's entire
session. Do not.

### 2. Every inbound message is checked against `contentWindow`

The frame has an opaque origin, so `event.origin` is the string `"null"` for
every widget and checking it would prove nothing. The identity check is the real
one:

```ts
if (!win || event.source !== win) return;
```

Nothing the frame says is privileged. It can only ask: for a height, to send a
prompt, or to export an image.

### 3. Heights are clamped, not trusted

```ts
Math.min(WIDGET_MAX_HEIGHT, Math.max(WIDGET_MIN_HEIGHT, Math.round(value)))
```

`WIDGET_MAX_HEIGHT` is 900, `WIDGET_MIN_HEIGHT` is 40. A generated document
cannot size its own frame past the cap or to zero.

### 4. The CSP limits what a widget can load

Defined in `src/lib/widget.ts`:

```
default-src 'none';
img-src data: blob:;
style-src 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com;
script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://esm.sh;
connect-src https://cdn.jsdelivr.net https://esm.sh
```

`default-src 'none'` is the enforcement; everything else is an exception.
`connect-src` must list the script hosts, because a permitted library can still
fetch its own chunks — that is how the mermaid ESM on `esm.sh` resolves its
imports. There are no remote images: `img-src data: blob:` only, which prevents
the widget from being a tracking pixel.

### 5. The fragment is inserted verbatim

A widget document is assembled by string concatenation. The fragment is **not**
rewritten — that would be security theatre, since it runs inside an opaque frame
anyway. The one thing that must not be lost is a `</script>` inside a string,
which is why the fragment lands in the `<body>` and the runtime lives in a
**separate** `<script>` the fragment cannot close.

Host tokens interpolated into the document *are* sanitised
(`sanitiseToken` strips `< > { } ;`), because a token containing `</style>`
would otherwise end the block early.

## The document the frame receives

`buildWidgetDocument(fragment, isDark)` emits, in order:

1. `<!DOCTYPE html>` with `data-theme` set to `light` or `dark`.
2. `<meta http-equiv="Content-Security-Policy">` — the CSP above.
3. `ERROR_JS` — error reporting **installed before the fragment runs**. It
   listens in the **capture phase** for `error` and `unhandledrejection`. A
   script that fails to load does not bubble, so capture is required, and this is
   the single most common failure (a generated 3D scene reaching for a three.js
   UMD build that no longer exists).
4. `<style>` — host tokens as `:root` variables, then `THEME_CSS` (both light and
   dark blocks, plus the palette as `--palette-1…8`), then base rules.
5. `<body>` — the fragment, verbatim.
6. `RUNTIME_JS` — `sendPrompt`, height reporting, theme application, and the
   rasteriser.

### Why both theme blocks ship

One attribute decides which is live, so a theme change is a **message**, not a
reload. A running 3D scene survives the user changing appearance. The host sends
`{ type: "theme", dark }` and the frame flips `data-theme`.

The theme is written *into* the document rather than matched by the frame against
the OS, because the user may have Pawzz in dark mode while their system is in
light — and matching would paint one frame of white before correcting itself.

## The globals a widget is handed

| Global | Purpose |
| --- | --- |
| `sendPrompt(text)` | sends a message to the chat as if the user typed it. The escape hatch that turns a chart back into a conversation. |
| *(height reporting)* | a `ResizeObserver` on `document.body` plus a `load` handler post `{ type: "height" }` |
| *(message listener)* | receives `theme` and `exportImage` |

## Export

Exporting is done **inside** the frame, not by the parent, because the parent
cannot read a pixel of an opaque-origin document.

- **Copy as image** — the frame serialises its DOM into an SVG `foreignObject`,
  draws that into a canvas, and posts a PNG data URL back. Written by hand rather
  than with `html2canvas` (or similar), because those libraries build their layout
  in a hidden iframe and read it — two opaque origins are cross-origin to each
  other, so the read throws. Canvases are swapped for `<img>`s of their own
  bitmaps before serialising; a WebGL scene's drawing buffer may already be empty,
  and that failure is reported rather than swallowed.
- **Download as HTML** — writes the self-contained document to disk. It carries
  its own CSP, palette and theme, so it opens correctly outside the app.
- **Copy code** — writes the raw fragment to the clipboard.

Requests are matched by a `requestId` nonce, so a widget cannot answer an export
it was not asked for.

## Adding a capability

1. Change the schema or description in `src/lib/widget-tools.ts` — this is the
   model's only contract.
2. If it needs a new host or global, change `CSP` / `RUNTIME_JS` in
   `src/lib/widget.ts` **and** the host list in the system prompt, so the model
   is told the same thing the policy enforces.
3. If it changes the stored shape, update `MessageWidget` in `src/lib/widget.ts`
   and the block handling in `src/lib/chat-messages.ts`.
4. Never add `allow-same-origin`. Never widen `default-src` to `*` or `https:`.