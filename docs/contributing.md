# Contributing

## Prerequisites

- **Bun** — the project is installed and run with it (`bun.lock` is committed).
  `npm`/`pnpm` will work but will not reproduce the lockfile.
- **Node.js 20+** — Next.js 15 requires it.
- An **OpenRouter API key** — free models only, but a key is required. Get one at
  <https://openrouter.ai/keys>.

## Setup

```bash
git clone https://github.com/Kenosis01/pawzz.git
cd pawzz
bun install
cp .env.example .env          # then fill in OPENROUTER_API_KEY
bun run dev                   # http://localhost:3000
```

`src/env.js` validates the environment with zod **at boot**, and a malformed key
fails loudly rather than surfacing as a confusing 401 on the first message. The
variable is declared in the `server` block on purpose: `@t3-oss/env-nextjs`
replaces that block with an empty stub in client bundles and throws if a
component reads it, so a stray `env.OPENROUTER_API_KEY` fails the build rather
than shipping the secret to devtools.

To build without a valid env (CI, Docker), set `SKIP_ENV_VALIDATION=1`.

## Verification before you push

```bash
bun run typecheck     # tsc --noEmit
bun run lint          # next lint
bun run build         # next build — the real gate
```

`next lint` prints a deprecation notice (Next 16 removes it) but works. The
migration is `npx @next/codemod@canary next-lint-to-eslint-cli .`; not done yet.

There is no test suite. Verification is a real build plus exercising the changed
surface in a browser or with `curl` (see [Smoke tests](#smoke-tests)).

## Conventions

Read these before opening a file for the first time; they are load-bearing.

### Routing

- A `page.tsx` does at most three things: resolve `params`, import a screen,
  render it. **All behaviour lives in `src/screens`.**
- `params` is a `Promise` in Next 15 — `await` it.
- A route group (`(app)`, `(bare)`) exists only to share a layout; it never
  appears in the URL.
- The App Router has no `NavLink`. Active state is derived from `usePathname()`
  and matched on a path boundary — `/chat` must not light up for `/chatty`.

### Screens

- A screen stays free of data fetching. That belongs in a hook or the store, so a
  screen can be reasoned about in isolation.
- Nothing in one screen folder imports from another; cross-screen needs move to
  `src/components`.

### State and storage

- Every `localStorage` / `sessionStorage` read and write is wrapped in
  `try/catch`. Blocked or full storage must degrade to "works for this session,
  is not remembered", never an error.
- **Never read storage during render.** There is no storage on the server, so a
  first render that disagrees with the client is a hydration mismatch. Read it in
  an effect and start from a fixed default.
- If you add a key, add it to the table in `docs/architecture.md` and bump the
  `.v1` suffix if the *shape* changes. `ALL_KEYS` in `PrivacySection.tsx` is a
  copy of that table — it is currently out of date and the section is no longer
  reachable, so do not treat it as the source.

### The chat runtime — the two rules that keep it fast

The transcript re-renders ~30 times a second while a reply streams. Two
invariants keep that linear, and breaking either one makes the page visibly
stutter:

1. **`fromUIMessages` must return the same object for an unchanged message.**
   That identity is what makes `memo(MessageRow)` real.
2. **Callbacks passed to the transcript must have a stable identity.** Read the
   live transcript through `liveRef`, not by closing over `messages`.

If you change `src/lib/chat-messages.ts`, preserve both.

### Truncate-then-append

`setMessages` followed by `sendMessage` in the same tick can apply the append to
the pre-truncation list, leaving one message twice under one id (a duplicate
React key). Any code that truncates and re-sends must **yield a microtask**
between the two — see `regenerate`, `regenerateFrom` and the pending-handoff
effect in `src/lib/use-pawzz-chat.ts`.

### Styling

- Use tokens from `src/styles/tokens.css`; add a new token to **both** `:root`
  and `.dark`.
- Component styles go in a sibling `*.module.css`.
- See [Design system](./design-system.md).

### Security

- Never add `allow-same-origin` to the widget iframe (see [Widgets](./widgets.md)).
- Never widen the widget CSP to `*` or `https:`.
- Never move the API key to a `NEXT_PUBLIC_` variable.
- Treat everything from the network as untrusted: parse as `unknown`, narrow,
  and bound lengths. The chat and title routes are the models for this.

## Common tasks

### Add a route

1. Create `src/app/(app)/<path>/page.tsx` (or `(bare)` if it must render without
   the shell).
2. Create the screen in the matching `src/screens/<surface>/` folder and export
   it from that folder's `index.ts`.
3. Add the row to `docs/routes.md`.

### Add a settings section

Two edits: a row in `src/screens/settings/settingsSections.ts`, and an entry in
the `SECTIONS` map in `SettingsSectionPage.tsx`. Registering `general` or
`appearance` there is a compile error — they ship as their own routes.

### Add an icon

Icons are hand-written Lucide geometry in `src/components/icons/Icons.tsx`, with
hover animations in `icons.module.css` triggered by an ancestor carrying
`data-icon-trigger`. Add the path and, if it animates, a CSS class. No icon
library is bundled.

### Change the prompt or the tool

The model's contract is `WIDGET_SYSTEM_PROMPT` and `showWidget` in
`src/lib/widget-tools.ts`. If a change needs a new CDN host or a new global,
update `CSP` / `RUNTIME_JS` in `src/lib/widget.ts` **as well**, so the prompt and
the policy say the same thing.

## Smoke tests

A quick manual check of the whole stack, useful after touching the API or chat:

```bash
bun run build && bun run start          # or PORT=3123 bun run start
curl -s localhost:3000/api/models | head -c 300        # 200 + catalogue
curl -N -X POST localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"id":"u1","role":"user","parts":[{"type":"text","text":"Say OK"}]}],"modelId":"openrouter/free"}'
curl -X POST localhost:3000/api/chat/title \
  -H 'Content-Type: application/json' -d '{"prompt":"how do transformers work"}'
# error paths
curl -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/chat -d '{}'
```

The chat call verifies the key, the allowlist and streaming in one shot. Then
open the app and confirm: send a prompt, watch it stream, ask for a chart, reload
the page and confirm the transcript and the widget came back.

## Deployment

The app is a standard Next.js deployment. There is no database and no
server-side state, so any host that runs `next build` / `next start` works.

- Set `OPENROUTER_API_KEY` in the host's environment (**server**-side; never
  prefix it with `NEXT_PUBLIC_`).
- **Add a rate limit** in front of `/api/*` before exposing it publicly — see
  [Abuse surface](./api.md#abuse-surface).
- `next.config.js` pins `outputFileTracingRoot` to the project directory; leave it
  unless you change the repository layout.

## Repository conventions

- Commit messages are short and imperative (`fix: …`, `add: …`).
- `bun.lock` is committed; `.env`, `.next`, `node_modules` and
  `*.tsbuildinfo` are not.
- The code style is dense, comment-heavy, and explains **why** a decision was made
  rather than restating the code. Match it: if a line looks odd, it usually has a
  reason recorded above it, and a change that removes the reason should remove or
  update the comment.

## Where to look next

- [Architecture](./architecture.md) — the whole picture
- [Status & roadmap](./status.md) — what is built and what is not