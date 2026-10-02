# Pawzz Design System

> Design system and UX specification for Pawzz — a desktop AI workspace.
> Pawzz's own tokens, its own rules. Not a copy of anything.

## Overview

Pawzz is a **warm ivory desktop workspace, set in precise modern typography, with restrained terracotta accents, almost no unnecessary shadows, generous whitespace, subtle motion, and a tiny curious animal quietly welcoming the user before disappearing into the work.**

The base atmosphere is a **warm ivory canvas** (`--background`, #f8f7f3) — deliberately not the cool grey-white every other AI brand reaches for. Interface text runs **Geist Sans** at weight 400–500. The wordmark and the one large display line per screen run **Cormorant Garamond** at weight 500 with negative tracking, paired with **Source Serif 4** for assistant replies. The combination should feel considered rather than technical.

Brand voltage comes from the **ivory + terracotta pairing** — terracotta (`--accent`, #c9785b) is the signature Pawzz accent, used on primary actions, the send button, the wordmark, and the active-nav rule. It is warm and slightly muted, never cyan or blue — a deliberate counter-positioning against the cool slates and saturated blues of the rest of the category.

The system has three surface modes that alternate context by context:

1. **Ivory canvas** (`--background` — #f8f7f3) — the default application floor
2. **Soft ivory panels** (`--surface-subtle` — #f3f1ec) — settings content, code, wells
3. **Near-black surfaces** (`#151515`) — the code editor sandbox, model-generated widgets, terminal output, the dark theme

The dark surfaces are where Pawzz shows its own product chrome. The light-to-dark contrast is the pacing rhythm.

### Principle 1 — No emoji

**Emoji do not appear anywhere in Pawzz.** Not in a settings radiogroup, not as an agent avatar, not as a section icon, not in an empty state, not in a button label, not in the documentation.

This is the system's first and least negotiable rule. The reasons are not aesthetic:

- **A system emoji font renders them differently on every platform.** The agent the user picked is not the agent their colleague sees. An identity that changes between machines is not an identity.
- **Emoji are not Pawzz's.** They belong to the operating system. A brand that borrows its iconography has no visual voice of its own to lose.
- **They are loud.** Pawzz is a workspace where someone reads for an hour. A grid of 💻 and 🌙 in a settings panel is a different product from the one the rest of the design describes.

Every glyph in Pawzz is one of exactly three things: a Lucide-stroke icon hand-written in `src/components/icons/Icons.tsx`, a typographic mark, or a tint. Where an emoji was doing visual work, it was replaced rather than merely removed:

| Was | Is now | Why |
| --- | --- | --- |
| 💻 ☀ 🌙 theme radios | Lucide `MonitorIcon` / `SunIcon` / `MoonIcon` + text labels | An icon alone is a guess; an icon plus a word is a control |
| Agent emoji grid | `BotMark` — a hand-drawn bot face, tinted from the status palette | Drawn as paths, so it is identical on every platform; it invents no new colour and it is recognisable at 22px, where four tints of the same dot were not |
| ✕ close glyphs | `XIcon` at 16px | Same stroke weight and terminal style as every other icon |
| Status emoji in empty states | Muted body text | The sentence already said it |

**Rule:** if a glyph is not in `Icons.tsx`, it does not exist. Adding one means adding it there, in Lucide geometry, at the correct size — not typing a character into a JSX string.

### Principle 2 — One button geometry

Every button that carries text in Pawzz is the same control. Not "visually similar" — the same:

```
height:        32px
padding:       0 var(--space-4)
font-size:     var(--text-small)   /* 13px */
font-weight:   500
border-radius: var(--radius-md)    /* 12px */
white-space:   nowrap
display:       inline-flex; align-items: center; justify-content: center
transition:    background / border-color / color / opacity
               var(--duration-micro) var(--ease-standard)
```

Three weights, and only three:

| Weight | Treatment | Used by |
| --- | --- | --- |
| Primary | `--accent` fill, `--accent-foreground` text | Send, Save, "Add to memory", "Create your Agent" |
| Secondary | `--surface-subtle` fill, 0.5px `--border` | Copy prompt, Cancel, secondary row actions |
| Text | No fill; muted, turning `--danger` on hover | Clear all, Show more, and other genuinely minor actions |

Disabled is `opacity: 0.4` with `cursor: default` on all three. Nothing else changes about a disabled button — a disabled button that also greys out its border reads as *unavailable system*, not as *not yet applicable*.

The interruption notice in the transcript ("reply stopped — Edit prompt / Retry") is two ordinary secondary buttons. It was previously a smaller, differently-pill-shaped variant, which made a normal state with two normal actions in it read as a system message. Icon-only square buttons (24×24) are a separate family and are covered under [Components](#components).

### Other standing principles

- **Border-first.** `--border` is the primary separator. Shadows are for genuinely floating surfaces only.
- **The reply is a document.** Assistant replies are set in Source Serif 4 at 16px/1.5 in a 46rem measure — the widest text in the app, because it is the text someone came to read.
- **Motion is one scale.** Three durations, one curve, nothing bounces.
- **Depth is colour-block first.** Ivory-versus-dark and hairline separation carry almost all the elevation. A visible shadow on every card is a violation.

---

## Colors

### Brand & Accent

- **Terracotta** (`--accent` — #c9785b): The signature Pawzz warm terracotta. The send button, primary actions, the wordmark accent, the active-nav left rule, the focus ring. The most recognisable Pawzz colour outside the paw mark.
- **Terracotta hover** (`--accent-hover` — #d58a6c)
- **Terracotta soft** (`--accent-soft` — #f1ddd4): Tints, selected fills, the memory "Unsaved" chip.
- **Terracotta dark** (`--accent` in `.dark` — #d0896c): **Lifted from the light value, not reused.** Terracotta at #c9785b on a #151515 ground sits near 3.4:1 and reads as muddy brown, losing the brand in the theme used for long working sessions. The dark accent is also the darkest text colour in dark mode, because it is the only hue that clears contrast on a near-black ground.
- **Terracotta soft dark** (`--accent-soft` — #3d2a22)

### Surface

- **Canvas** (`--background` — #f8f7f3): The default application floor. Warm ivory, deliberately not pure white.
- **Surface** (`--surface` — #fcfbf8): One step up. The composer, the inline edit block.
- **Surface elevated** (`--surface-elevated` — #ffffff): Popovers and dialogs. The only true white in the system, and only ever a floating surface.
- **Surface subtle** (`--surface-subtle` — #f3f1ec): Code, wells, grouped settings, the switch track at rest. One step off the canvas.
- **Sidebar** (`--sidebar` — #f4f2ed): Slightly deeper than the canvas so the navigation column recedes.
- **Sidebar hover** — #ece9e2 · **Sidebar active** — #e7e3dc
- **Dark canvas** — #151515. **Never pure black** — pure black makes elevation read as glare.
- **Dark surface** — #201f1e · **Dark elevated** — #262523 · **Dark subtle** — #1b1a19
- **Code background** — #f0eee9 light · #1a1917 dark
- **Border** — #e7e3dc · **Border subtle** — #eeebe3 · **Border strong** — #d9d4cb

Borders feel like one elevation step rather than ink lines. That is the whole reason they are warm greys and not greys.

### Text

- **Foreground** (`--foreground` — #191714): All primary text. Warm dark, off-pure-black.
- **Foreground secondary** (`--foreground-secondary` — #45413b): Row labels, emphasised prose.
- **Muted foreground** (`--muted-foreground` — #716d65): Hints, metadata, captions.
- **Placeholder** — #9b968d
- **Foreground display** — #191714, the one step above `--foreground` for hero lines
- **Foreground inverse** — #fcfbf8, text on a `--foreground` fill
- **On dark** — #f5f3ee · **On dark secondary** — #d6d2ca (warm, echoing the ivory)

### Semantic

- **Success** — #5c806a · **Warning** — #a57a45 · **Danger** — #b85c57 · **Info** — #667b91
- **Danger fill** (`--danger-fill` — #c33d31): Danger as a **background**. Split from `--danger` deliberately — the text value is tuned for legibility on a surface, and filled with it reads as a muddy chip.

### Categorical (model-generated visuals only)

A fixed eight-hue scale for widgets and charts:

```
1 #2a78d6 blue · 2 #eb6834 orange · 3 #1baf7a aqua · 4 #eda100 yellow
5 #e87ba4 magenta · 6 #008300 green · 7 #6250d6 violet · 8 #e34948 red
```

**The order is the point.** A categorical scale is only readable if the same category is the same colour in every chart of a conversation, which only holds if the order is fixed and never sorted by value. Chart.js cannot read CSS variables — a canvas has no cascade — so the model is told to hardcode the hex for canvas and use the variables for HTML.

### Syntax (code blocks only)

Syntax has its own eight-hue palette. The interface palette cannot do this job — one accent and four status colours would put keywords, strings, numbers and types on near-identical hues.

| Token | Light | Dark |
| --- | --- | --- |
| `--syntax-comment` | #6f6a61 | #8d8779 |
| `--syntax-keyword` | #8f3a63 | #e08cb8 |
| `--syntax-string` | #2f6b46 | #85c99c |
| `--syntax-number` | #8a5310 | #e0b264 |
| `--syntax-func` | #2a5a86 | #7fb6e6 |
| `--syntax-type` | #8a3a25 | #e69878 |
| `--syntax-const` | #63468a | #b295e2 |
| `--syntax-punct` | #4a463f | #a5a099 |

Hues chosen for separation around the wheel, not decoration. In dark they are the same hues lightened, not swapped — on a near-black block a saturated mid-tone is unreadable.

---

## Typography

### Font Family

The system runs **Geist Sans** as the interface face, **Geist Mono** for code, **Cormorant Garamond** as the editorial display face, and **Source Serif 4** for assistant replies.

| Token | Family | Use |
| --- | --- | --- |
| `--font-sans` | Geist Sans | Navigation, buttons, chat chrome, settings, forms, labels, names, system messages |
| `--font-mono` | Geist Mono | Code, file paths, commands, model ids, identifiers, JSON, logs, durations |
| `--font-editorial` | Cormorant Garamond | The wordmark, the greeting, large one-off display lines |
| `--font-response` | Source Serif 4 | Assistant replies, long-form generated prose |

Fallbacks: `Geist Sans, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif` · `Geist Mono, ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace` · `Cormorant Garamond, Georgia, serif` · `Source Serif 4, Georgia, serif`.

All four are self-hosted and subset at build time through `next/font`. No woff2 files are bundled in the repo.

### The display/body split is editorial

- **Cormorant Garamond**, weight 500, tracking -0.015em → wordmark, greeting, empty-state heads
- **Geist Sans**, weight 400–500 → body, navigation, buttons, captions, labels
- **Source Serif 4**, weight 400 → assistant replies
- **Geist Mono** → all code, model ids, identifiers

**Assistant replies are set in a serif on purpose.** Pawzz spends most of its life showing text someone is going to *read* — a report, an explanation, an essay. A serif at reading size is more legible than a grotesque at the same size, and it makes a long answer feel like a document rather than a log.

**Source Serif 4 rather than Cormorant for replies.** Cormorant is a display cut drawn for a wordmark and a single line. Below about 24px its strokes thin until a paragraph looks scanned rather than written. Source Serif 4 was drawn for body text — sturdier colour, taller x-height, an italic sturdy enough to sit beside the roman.

**Replies are weight 400, not 500.** Source Serif 4's regular already has the colour of a text face; 500 lands on 600 and makes the whole reply look emphasised throughout.

### Hierarchy

| Token | Size | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|
| `--text-brand` | 21px | 500 | — | -0.01em | The wordmark — Cormorant |
| `--text-page` | 30px | 400 | 1.15 | -0.01em | Page titles — Cormorant |
| `--text-section` | 22px | 400 | 1.25 | -0.005em | Section headings, dialog titles — Cormorant |
| `--text-subsection` | 17px | 500 | 1.4 | 0 | Row labels, card titles |
| — | 15px | 500 | 1.3 | 0 | Button labels, nav items |
| `--text-chat` | 16px | 400 | 1.5 | 0.001em | Assistant replies — Source Serif 4 |
| `--text-body` | 15px | 400 | 1.55 | 0 | Default UI text |
| `--text-small` | 13px | 400 | 1.45 | 0 | Hints, descriptions, secondary rows, buttons |
| `--text-caption` | 12px | 400 | 1.35 | 0 | Metadata, timestamps, counts |
| `--text-code` | 13px | 400 | 1.55 | 0 | Code, model ids — Geist Mono |

**Weights are declared explicitly, never left variable.** An unlisted weight is *synthesised* by the browser, and a synthesised bold inside a serif paragraph is a different typeface — which reads as a rendering bug rather than as emphasis.

**Negative tracking on Cormorant (-0.005 to -0.015em) is what keeps it reading as considered rather than decorative.** The sans body stays at tracking 0.

---

## Layout

### Spacing

- **Base unit:** 4px.
- **Tokens:** `--space-1` 4px · `--space-2` 8px · `--space-3` 12px · `--space-4` 16px · `--space-5` 20px · `--space-6` 24px · `--space-8` 32px · `--space-10` 40px · `--space-12` 48px · `--space-16` 64px
- **Settings row padding:** `--space-3` (12px) vertical, with a hairline between. This is the row unit.
- **Panel internal padding:** `--space-6` (24px) for panels; `--space-4` (16px) for dense cards.
- **Largest layout separation** in the application is `--space-8` (32px).

### Structure

```
┌────────────┬──────────────────────────────────┬────────────────┐
│            │                                  │                │
│  Sidebar   │        Main workspace           │   Workbench    │
│  260px     │        (fluid)                  │   480px        │
│  68px when │                                  │   conditional  │
│  collapsed │                                  │                │
│            ├──────────────────────────────────┤                │
│            │        Composer, 720px          │                │
└────────────┴──────────────────────────────────┴────────────────┘
```

- **Sidebar:** `--sidebar-width` 260px, collapsed to `--sidebar-width-collapsed` 68px (icons only, tooltips on hover).
- **Workbench:** `--workbench-width` 480px when open; collapses on narrow viewports.
- **Transcript measure:** `--reading-width` 780px, centred in the workspace.
- **Assistant replies:** `max-width: 46rem` — deliberately narrower than the composer prompt so the reply and its prompt share one visual column.
- **Composer:** `--composer-width` 720px, centred, docked to the bottom.
- **Settings dialog:** sidebar nav column + a content column capped at 620px.

### Whitespace philosophy

The ivory canvas + editorial display + generous internal padding create an editorial pacing — Pawzz reads like a long-form column rather than a product template. Whitespace between bands is uniform; whitespace inside panels is generous, letting type breathe.

**At very large widths the conversation stays constrained and whitespace increases.** Do not stretch content indefinitely.
---

## Elevation & Depth

| Level | Treatment | Use |
| --- | --- | --- |
| Flat | No shadow, no border | Body content, the transcript, page bands |
| Soft hairline | 0.5px `--border` | Inputs, settings rows, panel edges |
| Ivory panel | `--surface-subtle` background, no shadow | Code blocks, wells, grouped settings |
| Elevated surface | `--surface-elevated`, no shadow | Popovers, dialogs, dropdowns |
| Dark surface | near-black, no shadow | Code editor, model-generated widgets, dark theme |
| Material | `--material` + `--material-blur` | macOS translucent layers — sidebar, workbench chrome |
| Floating shadow | `--shadow-raised` / `-popover` / `-window` | Only genuinely floating surfaces |

**Depth is colour-block first, shadow rare.** Most depth comes from ivory-versus-dark surface contrast and hairline separation. **A visible shadow on every card is a violation of this system.**

The three shadows, and when each applies:

- `--shadow-raised` — `0 1px 2px rgb(0 0 0 / 0.04)`. A selected segmented control, a lifted tab. Barely there.
- `--shadow-popover` — `0 0 0 0.5px var(--material-border), 0 8px 28px rgb(0 0 0 / 0.12)`. Menus and popovers. The hairline is part of the shadow so a popover never has a separately-declared border.
- `--shadow-window` — `0 1px 2px + 0 8px 24px`. Dialogs only.

In dark theme each carries more weight: shadows disappear against a near-black ground unless deepened, so `--shadow-popover` goes to `0.5` alpha and `--shadow-window` to `0.4 / 0.24`.

**Material** (`--material`, `--material-blur`) is macOS-only translucent chrome. It degrades to a solid `--surface` elsewhere and must always have a legible fallback — a translucent layer with no fallback is unreadable.

### Decorative depth

- The paw mark appears as a small ink glyph in the wordmark and as the empty-state mascot.
- Code and widget surfaces carry their own internal depth — syntax highlighting in the eight syntax hues, line numbers in `--muted-foreground`.
- No glows, no neon, no glassmorphism. The composer may take a soft shadow because it floats; a settings row may not.

---

## Shapes

### Border radius

| Token | Value | Use |
| --- | --- | --- |
| — | 3px | The card tag stamp — a literal border on content, not a control |
| `--radius-sm` | 8px | Small inline controls, colour swatches, icon buttons |
| `--radius-md` | 12px | **Buttons, text inputs, nav items, segmented controls, dialogs** |
| `--radius-lg` | 16px | Panels, cards, code blocks, popovers |
| `--radius-xl` | 20px | Large windows, the settings dialog |
| `--radius-composer` | 22px | The prompt composer — the most rounded surface in the app |
| — | 999px | Only where semantically a pill: the switch track, status badges |

**Do not make everything a pill.** A pill is a shape with a meaning. Applying it to every control is what makes a product read as unserious. The switch track is a pill because it *is* a track.

### Iconography

Lucide geometry, hand-written in `src/components/icons/Icons.tsx`. No icon library is bundled.

| Size | Use |
| --- | --- |
| 14px | Inline with text, response action rows |
| 15–16px | Compact controls, sidebar rows, settings rows |
| 18px | Normal controls |
| 20px | Primary controls |
| 24px | Prominent empty states |

Stroke width stays visually consistent across the set — the same visual weight as the type at the same size, not the same numeric value.

**Every icon in the app comes from that one file.** An emoji is not an icon. See [Principle 1](#principle-1--no-emoji).

### Avatars

**A bot face. Never an emoji, never a photograph, never a generated image.**

- `BotMark` (`src/components/brand/BotMark.tsx`): four faces — `antenna`, `visor`, `pods`, `crest` — drawn on one 24 grid with a shared head, stroke weight and eye placement, so the set reads as a family. Everything is `currentColor` over a 14%-opacity fill of the same colour, so one set of paths serves every tint.
- Why a face and not a coloured dot: initials on a tinted circle made the tint the entire identity, and a circle of solid colour is the one shape that reads as a swatch. A face carries the choice; the colour only says which one was picked.
- Four tints — `--accent`, `--success`, `--info`, `--warning` — drawn from the existing status palette. **An avatar must not invent a colour that means something else somewhere in the app.**
- Sizes: 30px in a 44px `--radius-md` tile on the agents settings preview, 20px in a 26px swatch in the picker. Selection is a 14% wash of the bot's own tint plus an inset hairline in it — the foreground ring a solid swatch needed is far too heavy around a face.
- Still no emoji. A system emoji font renders differently on every platform, so the agent the user picked would not be the agent their colleague sees.

### Illustration & imagery

Pawzz uses almost no illustration. The system is:

- The paw mark, at small sizes, as a brand and empty-state device
- Model-generated widgets, which supply the visual interest at scale
- Code surfaces, which carry their own internal detail

**No stock photography. No abstract AI imagery. No glowing brains, no neon neural networks, no robots.** Pawzz owns its visual identity through restraint and the mascot.

---

## Components

### Buttons

Covered in full under [Principle 2](#principle-2--one-button-geometry). Three text-bearing weights — primary, secondary, text — all at 32px / `--radius-md` / weight 500.

**Icon-only buttons** are a separate family: 24×24 (`--radius-sm`), `--muted-foreground`, transparent background, turning `--foreground` on a `--surface-subtle` hover. They appear in the response action row under each assistant reply, and in the sidebar row menu.

**Destructive actions are text buttons, not filled danger buttons.** "Clear all" on the memory document is a muted text button that turns `--danger` on hover. A filled red button on a routine settings action announces an emergency that isn't happening.

### The composer

The most important control in the app.

```
width:       var(--composer-width)   /* 720px, centred */
border-radius: var(--radius-composer)  /* 22px — the most rounded surface */
background:  var(--surface)
```

- Multi-line, grows with content up to a ceiling, then scrolls.
- Send is an icon button that becomes terracotta when there is input and muted when there is not.
- The **plus menu** and the **model picker** sit at the composer's left and right edges, at the bottom — they belong to the prompt, not to the page.
- Voice input sits beside send.
- The composer takes a soft shadow because **it genuinely floats** above the transcript. It is the one place in Pawzz where a shadow on a non-modal surface is correct.

### The squish switch

44×24px, `--radius-full` track, 18px thumb, 3px inset.

- Track at rest is `--surface-subtle`; on is `--accent`. The thumb cross-fades with the track.
- **The thumb's squash is done in JS with a transform, not in CSS** — the drag and the squash are the same gesture, and splitting them across two systems makes them disagree.
- The visible track stays small because it is a setting, not a button pressed often; the **hit area is larger** via an `inset: -8px` pseudo-element, so the control is still comfortable to hit.
- `touch-action: pan-y` — the control drags horizontally, so a vertical swipe starting on it must still scroll the page.
- Under `prefers-reduced-motion` the squash is dropped and the switch cross-fades between states without travel.

### Segmented controls

Used for theme selection and similar 2–4 way choices.

- The group is a `--surface-subtle` well with a hairline and `--radius-md`; each segment is a transparent child.
- The selected segment gets `--surface-elevated` background and `--shadow-raised`. **Not a border change** — a border that appears and disappears shifts the layout by a pixel, and the lift reads as depth rather than as a reflow.
- A segmented control with fewer than three options and short labels is a **radio group with visible labels** instead (see Theme, below).

### Theme selector

A `role="radiogroup"` with three options: **System, Light, Dark**.

Each option is a 30px inline-flex control carrying **both a Lucide icon and a text label** — `MonitorIcon` + "System", `SunIcon` + "Light", `MoonIcon` + "Dark".

**Why the label matters:** three icons in a row is a guess. A sun and a moon are widely understood; a monitor glyph is not universally "follow the OS", and a screen-reader user gets an unlabelled radio either way. The icon is a redundant cue, the word is the meaning. This is also what replaced three emoji.

### Settings rows

The settings dialog is a **plain row list — label left, control right, hairline between. No cards.**

```
padding:      var(--space-3) 0
border-bottom: 0.5px solid var(--border-subtle)
```

- Row label at `--text-body`; a hint line beneath it at `--text-small` in `--muted-foreground`.
- The control is right-aligned and never shrinks — `flex-shrink: 0`.
- A row's label column may wrap and truncate; the control column may not.
- **Grouped settings sit on a `--surface-subtle` well** when they need to read as one unit — the well, not a stack of bordered cards, is what groups them.

### Section header

`--text-section` (22px) in Cormorant Garamond, with a `--text-small` muted subtitle beneath it describing what the section is for.

Dialog titles use the same treatment. **There is no other heading level in Pawzz** — no h3-scale type. A subsection inside a section is a `--text-subsection` label at weight 500, not a bigger heading.

### Empty states

**Muted body text on the ivory canvas. No illustration, no emoji, no mascot at scale.**

The sentence does the work: state what is missing and what will make it appear. The one exception is the chat empty state, where the paw mark and the greeting are the point of the screen.

### The Memory document

Memory is its own section in the settings registry — `/settings/memory`, its own tab, its own component (`MemorySection.tsx`) — rather than a block inside General.

**Why it is not a preference row:** memory is a document the user writes in, not a setting they toggle. A textarea squeezed into a settings row with a Save button beside it cannot be either — it cannot be scrolled through, it cannot be read while editing, and it makes General longer for everyone who does not use it.

#### The document surface

**The editor is the panel.** Not a field inside a panel.

```
.doc {
  flex: 1;
  min-height: 220px;
  border-radius: var(--radius-lg);
  background: var(--surface-subtle);
  border: 0.5px solid var(--border-subtle);
}
.doc:focus-within {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-raised);
}
.editor {
  height: 100%;
  font-family: var(--font-mono);
  font-size: var(--text-code);
  line-height: 1.7;
  tab-size: 2;
  resize: none;
  spell-check: false;
}
```

- **Full height.** The editor takes the vertical space the panel has, so it reads as a page rather than as a control.
- **Not resizable.** A user-resizable textarea gives them a drag handle for a one-time decision. The panel is already sized by the dialog.
- **Monospace, spellcheck off.** This is a markdown source document, not prose. Both of those are load-bearing: a proportional face hides `#` alignment, and the red squiggles of a spellchecker are noise on a file full of model names and identifiers.
- **The hairline thickens on focus** and gains `--shadow-raised`. A 2px accent border on focus was tried and reads as an error state.
- Above the editor: a header with the section title, the subtitle, an entry count, and an `Unsaved` chip in `--accent-soft` whenever the draft differs from what is stored.

Below the editor, a status row carries **Save** (primary, disabled when not dirty) and **Clear all** (text button, `window.confirm` guarded).

#### Typing a checkbox

`[]`, `[ ]` or `[x]` at the **start of a line** becomes a task-list item the moment the closing `]` lands. A trailing space is accepted too, so the whole `[ ] ` form still works when the `]` arrives through an IME.

- The trigger is the token, not the list. Milkdown's own GFM rule (`/^\[(?<checked>\s|x)\]\s$/`) walks *up* from the caret looking for a `list_item` to flag, so from an empty paragraph it finds nothing and the three characters sit there as text — the checkbox is an attribute on the `list_item` node, not a mark, and the only other way to reach one is to have typed `- ` first.
- Inside a list item the token sets that item's `checked`; anywhere else it builds the list itself and carries any text typed after the caret into the new item.
- Only a plain paragraph line qualifies. A `[ ]` that opens a heading is a heading, and a `[ ]` mid-sentence is prose.
- The stored file keeps the markdown spelling (`- [ ] milk`), so a checkbox in the editor and a `- [ ]` in `pawzz.memory.md` are the same thing, and a reloaded document parses back into the same checkboxes.

#### Learn from your chats

A section beneath the document with a `SquishSwitch` and a single-line capture input.

- **On**: Pawzz extracts durable facts from conversation as it happens — preferences stated, corrections given, instructions issued.
- **Off**: nothing is extracted. The default is opt-in; a workspace that reads your conversations without being asked to is a different product.
- The capture input adds a dated line manually: `[YYYY-MM-DD] - <text>`, appended to the end of the document. Dated, because memory without a date cannot be reasoned about later.

#### Start import — the nested dialog

A **secondary button on the right of the section header**, which opens a dialog stacked *on top of* the settings dialog.

```
.scrim {
  position: fixed; inset: 0;
  z-index: calc(var(--z-modal) + 1);
  background: rgb(0 0 0 / 0.32);
  backdrop-filter: blur(6px) saturate(120%);
}
.dialog {
  max-width: 560px;
  max-height: min(720px, calc(100vh - 80px));
  border-radius: var(--radius-xl);
  background: var(--surface-elevated);
  box-shadow: var(--shadow-window);
  animation: dialog-in var(--duration-normal) var(--ease-standard) both;
  /* scale .98 → 1 */
}
```

**The scrim blurs and darkens the dialog behind it.** This is the whole point of the pattern: the parent dialog stays visible so the user never loses their place, and the blur plus the 32% dark wash plus the dialog's own shadow give the new layer unambiguous focus. The parent does not move, and nothing about the parent's geometry changes.

- `z-index: calc(var(--z-modal) + 1)` — one above the settings dialog, which is the correct relationship rather than a new rung on the ladder.
- Click on the scrim closes. Click inside the dialog does not — `stopPropagation`, not a second scrim.
- `--shadow-window` is reserved for exactly this: a genuinely floating window over other UI.
- Entry animation is scale `.98 → 1` plus opacity over `--duration-normal`. **No slide, no bounce.**

**Contents** — a title, a close button, two numbered steps, and an action row:

1. **Copy this prompt into a chat with your other AI provider** — a fixed `EXPORT_PROMPT` in a mono `--surface-subtle` box with a **Copy prompt** secondary button that becomes "Copied" on success.
2. **Paste the results below to add to Pawzz's memory** — a paste area, with the label wired via `htmlFor`.

Then **Cancel** (secondary) and **Add to memory** (primary, disabled while the paste area is empty).

The prompt asks the other provider for stored memories grouped as Instructions, Preferences, Facts, and People, preserving the user's own words, wrapped in a single code block for copying. **It asks for the other provider's stored memory, not for a summary of the conversation** — a summary of the conversation is not memory, and importing one silently fills Pawzz's memory with something that will be wrong in a week.

### Dialogs

- `--radius-xl` (20px), `--surface-elevated`, `--shadow-window`. The only floating shadow on a modal surface.
- Title at `--text-section` in Cormorant; a close `XIcon` at 16px in the top-right.
- Capped at `min(720px, calc(100vh - 80px))` and scrolls internally.
- **`aria-modal="true"` and a labelled `aria-labelledby`.** A dialog with no accessible name is a dialog a screen reader announces as nothing.
- Nested dialogs stack with `calc(var(--z-modal) + n)` and each carries its own blurred scrim.

### Toasts

Transient, bottom-right, `--surface-elevated`, `--radius-lg`, `--shadow-popover`. `--text-small`.

`--z-toast` (600) puts them above every overlay. **A toast is never used for something the user must act on** — a failed save is a persistent inline message, because a message that disappears is a message that gets missed.

### Code blocks

`--code-background`, `--radius-lg`, mono at `--text-code`, syntax-highlighted in the eight syntax hues. Line numbers in `--muted-foreground`. A copy button in the corner at 24×24.

**Code is horizontal-scrollable, never wrapped.** Wrapping code destroys its structure — a wrapped `===` looks like a different operator than it is.

### The transcript

- Messages are a flex column at `--space-6` gap, capped at `--reading-width` and centred.
- **User messages**: right-aligned, contained in a `--surface-subtle` bubble at `--radius-lg`, weight 500, capped at `min(85%, 34rem)`. They are a statement, not an essay, and the containment is what makes that legible.
- **Assistant replies**: full-measure prose at `max-width: 46rem`, Source Serif 4, 16px/1.5. Left-aligned, unboxed. A reply is a document, and documents do not sit in bubbles.
- **A widget occupies the reply's width and nothing more.** It was once allowed to break out to a wider column on the theory that a dashboard needs the room; that put a 1080px chart under 780px of prose and made the reply read as assembled rather than written. The chart is drawn to fit, not the column stretched to fit the chart.
- Long messages clamp at 12 lines with a bottom fade to the bubble's own surface, so the cut dissolves rather than being sliced, and "Show more" sits below.

### Streaming & the thinking mark

While a reply arrives, a small paw mark breathes beneath it — two oscillations of decreasing amplitude, `--duration-normal`, scaling only.

**No `opacity` anywhere in that animation, and that is a deliberate constraint rather than an omission.** A mark that also fades reads as appearing and disappearing; it stops being an object and becomes a blinking indicator. Scaling alone keeps it present at all times and lets the motion carry the meaning, which is what makes it read as *something working* rather than *something about to appear*.

When the reply settles the mark holds, unanimated, at scale 0.94. **An answer that keeps pulsing after it is finished is nagging rather than signing off.**

### The interruption notice

A single quiet bar — not a message row. Nothing was *said*; the reply was cut off by the reader, and putting that in the assistant's column would attribute the interruption to the model.

```
background: var(--surface-subtle)
border: 0.5px solid var(--border-subtle)
border-radius: var(--radius-md)
```

Text left, **two ordinary secondary buttons right** ("Edit prompt", "Retry"). The actions sit on the right because they are a decision, and a decision belongs where the eye already is after a long answer.

### Errors

A failed request is shown **under the transcript, not as a message row**. It is not something the assistant said, and rendering it in the assistant's column puts words in its mouth that it never spoke.

`--foreground-secondary` on `--surface-subtle`, `--danger` left rule, `--radius-sm`. Persistent — never a toast.

### Focus

`--focus-ring` resolves against whichever `--accent` is active, so it needs no per-theme value. Always visible, never `outline: none` without a replacement.

**A focus state is never removed for aesthetics.** The inline edit block, the selects, and the memory editor all replaced the browser outline with something of their own rather than with nothing.

### Tooltips

`--text-caption`, `--muted-foreground` on `--surface-elevated`, `--radius-sm`, `--shadow-popover`. On hover **and** on keyboard focus. Never on anything whose label is already visible.

### Keyboard

`⌘K` command palette · `⌘B` toggle sidebar · `⌘J` new conversation · `Esc` close the topmost layer only.

`Esc` closes **one** layer. In the memory import dialog, `Esc` closes the import dialog and leaves the settings dialog open. Closing both would lose the user's place in a document they are editing.

### Motion

| Token | Value | Use |
| --- | --- | --- |
| `--duration-micro` | 140ms | Hovers, focus, colour and opacity changes |
| `--duration-normal` | 220ms | Popovers, dialogs, panels appearing |
| `--duration-workspace` | 360ms | The workbench and mode changes — the only transition long enough to read as movement |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Everything |

**One curve. Nothing bounces, nothing overshoots, nothing springs.** Pawzz moves the way a page turns.

Under `prefers-reduced-motion: reduce` every duration collapses to `0.01ms`. Anything that carried meaning through motion is replaced with a static equivalent rather than simply removed — the settled mark holds instead of pulsing, because a silent row with no indicator at all looks like a finished reply.

---

## Do's and Don'ts

### Do

- **Use one of the four fonts for the right job.** Cormorant for the wordmark and large display lines, Geist Sans for the interface, Source Serif 4 for assistant replies, Geist Mono for code.
- **Set assistant replies in the serif at 16px/1.5.** This is the most important typographic decision in the app.
- **Use `--space-*` tokens.** No raw pixel values in padding, margin, or gap.
- **Separate with hairlines** (`--border`, `--border-subtle`). Reach for a shadow only when the surface genuinely floats.
- **Use `--radius-sm` through `--radius-xl`,** and `--radius-composer` for the composer.
- **Keep text on `--foreground` / `--foreground-secondary` / `--muted-foreground`.** Reserve `--danger` for danger.
- **Give every icon a text label when it stands alone** — a settings option, a nav destination, an action with no obvious meaning.
- **Match a control's geometry to its neighbours.** A 26px button next to a 32px button is a bug.
- **Say what is missing and what will fill it** in an empty state, in one muted sentence.
- **Test in both themes.** Every value in this document has a dark counterpart; check that one exists.

### Don't

- **Don't use an emoji.** Anywhere. For anything. See [Principle 1](#principle-1--no-emoji).
- **Don't put a shadow on a card, a settings row, or anything else that isn't floating.**
- **Don't make everything a pill.** 999px radius is for the switch track and status badges.
- **Don't use a font weight you haven't declared.** It will be synthesised, and a synthesised serif bold is a different typeface.
- **Don't set body copy in Cormorant.** It is a display cut; below ~24px it looks scanned.
- **Don't stretch the conversation to fill a wide window.** The measure is fixed; whitespace grows.
- **Don't shrink text below 12px,** and don't use letter-spacing to fit a label into a narrow control.
- **Don't use `--danger` as a background,** and don't use `--danger-fill` as text. They are tuned separately.
- **Don't animate for decoration.** If nothing changed state, nothing should move.
- **Don't use `outline: none`** without a visible replacement in the same rule.
- **Don't render a user avatar as an emoji or a generated image.** `BotMark`, tinted from the status palette.
- **Don't sort the categorical palette.** Its order is what makes it readable across charts.

---

## Responsive Behavior

Pawzz is a desktop application first. It adapts to smaller windows; it is not a mobile product and should not be treated as one.

| Breakpoint | Behavior |
| --- | --- |
| **≥ 1280px** | Full three-region shell. Sidebar expanded at 260px, workbench at 480px, transcript centred at 780px. |
| **1024–1280px** | Workbench overlays the workspace rather than taking a column, or closes by default. |
| **768–1024px** | Sidebar collapses to 68px (icons + tooltips). Transcript measure shrinks toward the viewport; `--reading-width` is a maximum, not a target. |
| **< 768px** | Sidebar becomes an overlay. The composer stays docked and full-width minus gutters. The settings dialog goes full-screen with the nav as a horizontal scroller. |

**Rules at every width:**

- **The transcript measure is a maximum.** Content narrows; it never stretches.
- **Touch targets stay ≥ 44px** even when the visible control is smaller. The squish switch's `inset: -8px` hit area exists for this.
- **Nothing is hidden behind a hover.** Anything reachable by hover is reachable by focus, and by tap.
- **The memory document keeps its full height.** It is the point of its panel; it does not collapse to a summary at small widths.
- **The import dialog caps at `min(560px, 100vw - 40px)`** and scrolls internally rather than overflowing.

---

## Iteration Guide

### When to change a token

Changing a token in `src/styles/tokens.css` changes it everywhere. That is the intent. Read the token's annotation in that file before editing it — each one says what it is for and what it replaced.

**If you find yourself overriding a token in more than one component, the token is wrong, not the components.**

### When to add a component

Reach for an existing one first. `SquishSwitch`, `ConfirmDialog`, `Select`, `XIcon`, the button geometry. A new primitive needs a reason that "this one is slightly different" does not cover.

### The settings registry is data

`settingsSections.ts` is the single source of truth for the settings nav *and* the route table. A new section means an entry in that array and a component in the `SECTIONS` map in `SettingsSectionPage.tsx`. The route dispatches on the registry id and an unknown id 404s — so a section listed in the nav but missing from the map is a broken link, and one present in the map but missing from the registry is unreachable.

### Quality bar

Before a change is done:

- `bun run typecheck` — clean
- `bun run lint` — clean
- Checked in **both** light and dark theme
- Checked at **1280px and 768px**
- **Keyboard-navigable end to end**, with a visible focus state at every stop
- No emoji (grep `src/`)
- No new shadow on a non-floating surface
- Copy reads as written by a person, not generated

### What this document is for

It is a specification, not a mood board. When the code and this document disagree, one of them is a bug — decide which, and fix it rather than documenting the divergence as permanent.

---

## Known Gaps

Honest accounting of where Pawzz is not yet what this document describes.

**Settings**
- The registry lists six sections, all six reachable. Privacy, Shortcuts, and About were once listed; they are now **removed from the registry** rather than 404ing, and their components are still on disk but unreachable. Appearance folded into General, with `/settings/appearance` kept as a redirect so old links resolve. Whether the unreachable components get rebuilt or deleted is open.
- `PrivacySection` references `styles.group` and `styles.buttonDanger`, **neither of which exists** in the stylesheet. The section has therefore never been visually validated. Its `ALL_KEYS` list is also short by three keys the app now writes — `pawzz.memory.md`, `pawzz.motion`, and `pawzz.models.enabled.v1` — so a "clear all" through that screen would leave them behind.
- A `border-left` accent rule in `SettingsPage.module.css` is **dead** — nothing selects it.

**Naming**
- The mode is called **"Work"** in the code and **"Co-work"** in this document and in every user-facing string. This is an unresolved rename, not a stylistic choice.

**Layout**
- The **workbench resizer is structurally broken** — the drag handle does not actually resize the panel. The width token changes; the layout does not follow.
- `--workbench-width` is 480px in the tokens but was specified as a 360–720px range. It needs to become a clamped range the user can drag.

**Tokens**
- `Composer.module.css` uses **local `--cmp-*` variables instead of the token system.** Every other component reads from `tokens.css`. This is a divergence that will drift and should be collapsed.

**Widgets**
- Charts receive hardcoded categorical hex values because canvas has no CSS cascade. This is a real constraint, but it means the palette is duplicated in JS and can fall out of sync with the tokens.

**Product**
- **Co-work and Design modes** are specified in detail and are not built. This document describes the target, not the current state.
- The **market site** is out of scope for this document.
