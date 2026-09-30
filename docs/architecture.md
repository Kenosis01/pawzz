# Architecture

## The shape of the product

Pawzz is a **local-first** chat client with a **stateless** server tier.

- The server holds one secret (the OpenRouter API key) and owns three things:
  streaming a completion, naming a conversation, and serving the model catalogue.
- It stores nothing. There is no database, no session, no user record.
- The client stores everything that is "yours": conversations, the display name,
  theme, sidebar geometry, the selected model, the enabled-model shortlist and
  the incognito flag. All of it lives in `localStorage` — see
  [Data & storage](#data--storage).

The consequence is that a deployment is trivially horizontal, and that "your
data" is literally the browser profile you used.

## Stack

Read from `package.json` and `tsconfig.json`; the installed Next.js at the time
of writing is 15.5.26.

| Concern | Choice |
| --- | --- |
| Framework | Next.js `^15.2.3`, App Router, React Server Components by default |
| UI | React `^19`, hand-written CSS Modules + a design-token stylesheet |
| Language | TypeScript `^5.8`, `strict`, `noUncheckedIndexedAccess` |
| Model SDK | Vercel AI SDK — `ai` `^7`, `@ai-sdk/openai` `^4`, `@ai-sdk/react` `^4` |
| Provider | OpenRouter (`https://openrouter.ai/api/v1`) |
| Markdown | `react-markdown` + `remark-gfm`, `remark-math`, `rehype-katex`, `rehype-highlight` |
| Motion | `motion` `^13` (one component: the squish switch) |
| Validation | `zod` `^3` + `@t3-oss/env-nextjs` `^0.12` for the env contract |
| Styling build | Tailwind v4 is wired through `@tailwindcss/postcss`; the app itself styles with CSS Modules and tokens |
| Package manager | Bun (`bun.lock`) |
| Lint / format | ESLint flat config (`typescript-eslint` type-checked) + Prettier |

There is **no** state-management library, no data-fetching library, and no
component kit. State is React context plus hooks; data fetching is `fetch` in an
effect.

## The three layers

```
src/app          routing only — files that map URLs to screens
src/screens      one component per product surface (page-level composition)
src/components   reusable UI, split by domain (chat, layout, ui, brand, icons, design)
src/lib          hooks and pure logic (no JSX except context providers)
src/state        the conversation store (React context + localStorage)
src/styles       global CSS, design tokens, font notes
```

`src/app` files are deliberately trivial. A `page.tsx` does three things at
most: resolve `params`, import a screen, and render it. All behaviour lives one
level down in `src/screens`, so a screen can be read and changed without
navigating the routing tree. See [Project structure](./project-structure.md) for
the annotated tree and [Routes](./routes.md) for the mapping.

## Request flow: a single message

```
Composer.send()
  └─ ConversationPage.onSend → usePawzzChat.send()
       ├─ commitUser()            writes the user message to the store immediately
       ├─ requestTitle()          fire-and-forget POST /api/chat/title
       └─ sendMessage(user)       AI SDK → POST /api/chat
                                     ├─ readBody()          narrows untrusted JSON
                                     ├─ isKnownModel()      allowlist against the cached catalogue
                                     ├─ streamText()        OpenRouter, with the show_widget tool
                                     └─ toUIMessageStreamResponse()
       └─ useChat streams deltas → transcript re-renders (throttled to 32 ms)
       └─ onFinish → replaceMessages()   one write to the store per turn
```

Two sources of truth meet in exactly one place, `onFinish`. The AI SDK owns the
transcript *while it is streaming*; the store owns it *between* conversations.
See [Chat runtime](./chat-runtime.md) for the full contract.

## Security boundaries

Three boundaries carry weight, and each is enforced by structure rather than by
convention:

1. **The API key never reaches the browser.** It is a `server`-block variable in
   `src/env.js`. `@t3-oss/env-nextjs` replaces the server block with an empty
   stub in client bundles and throws if a component reads it, so a stray
   `env.OPENROUTER_API_KEY` fails the build instead of shipping the secret.
2. **A client cannot choose an arbitrary model.** `POST /api/chat` validates the
   requested model id against the same cached catalogue the UI lists
   (`isKnownModel` in `src/app/api/models/catalogue.ts`). An unrecognised id is
   refused, not forwarded.
3. **Model-written code cannot touch the app.** A widget runs in
   `<iframe sandbox="allow-scripts">` — deliberately without `allow-same-origin`,
   so its documents sits on an opaque origin with no access to cookies,
   `localStorage` or the parent DOM. A Content-Security-Policy in the frame
   restricts what it can load. See [Widgets](./widgets.md).

## Data & storage

Everything client-side is keyed in `localStorage` (one key in `sessionStorage`).
The authoritative list is also encoded in `src/screens/settings/sections/PrivacySection.tsx`.

| Key | Written by | Holds |
| --- | --- | --- |
| `pawzz.conversations.v1` | `src/state/conversation.tsx` | every conversation and its transcript |
| `pawzz.name` | `src/lib/greeting.ts` | display name, used only for the greeting |
| `pawzz.theme` | `src/lib/theme.ts` | `light` / `dark`; absent when following the system |
| `pawzz.sidebar.width` | `src/lib/sidebar.ts` | sidebar width in px (clamped 200–420) |
| `pawzz.sidebar.collapsed` | `src/lib/sidebar.ts` | `"true"` when collapsed |
| `pawzz.model` | `src/lib/model-preference.ts` | default model id |
| `pawzz.effort` | `src/lib/model-preference.ts` | one of `low…max` |
| `pawzz.thinking` | `src/lib/model-preference.ts` | `"1"` when thinking is on |
| `pawzz.incognito` | `src/lib/incognito.tsx` | `"1"` when incognito is on |
| `pawzz.models.enabled.v1` | `src/lib/model-catalogue-context.tsx` | JSON array of enabled model ids |
| `pawzz.pending.v1` *(`sessionStorage`)* | `src/lib/chat-handoff.ts` | the first prompt, during navigation to `/chat/:id` |

Every read and write is wrapped in `try/catch`. Blocked or full storage degrades
to "the session works, the preference is not remembered" rather than an error.

Two storage reads happen in an effect rather than in a `useState` initialiser
(theme, model preference, sidebar, incognito). That is not incidental: there is
no storage during a server render, so reading it during render produces a
hydration mismatch. The theme additionally has an inline bootstrap script in
`src/app/layout.tsx` so the correct surface is painted before first paint — if
you touch `src/lib/theme.ts`, mirror the change in `THEME_BOOTSTRAP`.

## Rendering & performance decisions

- **The transcript is memoised per row** (`MessageRow`, `memo`). This only pays
  off because `fromUIMessages` returns the *same object* for an unchanged
  message; identity is the contract that makes the memo real.
- **Streaming renders are throttled** to 32 ms (`STREAM_THROTTLE_MS`).
- **`fromUIMessages` is allocation-free on the hot path** — it reuses both the
  message object and the `blocks` array when nothing changed.
- **Widget frames never reload on a theme change.** The document is built with
  both theme blocks present and one attribute selects between them; a running 3D
  scene survives an appearance switch.
- **Server-side stream smoothing** (`smoothStream`, 12 ms/word) removes
  provider burstiness at the point where the burst actually happens.

## Unknowns and deliberate gaps

- `AppShell` accepts a `workbenchTabs` prop, but no screen passes one yet, so the
  workbench never opens. It is infrastructure for the design/co-work surfaces.
- There is no authentication. Against a public URL, `/api/chat` and
  `/api/chat/title` are open and spend the deployment's OpenRouter key. See
  [API reference → Abuse surface](./api.md#abuse-surface).