<p align="center">
  <img src="public/favicon.ico" width="48" height="48" alt="Pawzz" />
</p>

<h1 align="center">Pawzz</h1>

<p align="center"><em>A quiet place to think out loud.</em></p>

<p align="center">
  A local-first chat client for OpenRouter, built with Next.js 15 and the AI SDK.
  The model can write and run a small visual — a chart, a diagram, a 3D scene —
  inline in the conversation, inside a sandbox that cannot touch your app.
</p>

---

## What it does

- **Streams answers** from any free model OpenRouter publishes, paced
  server-side so text arrives at reading speed rather than in bursts.
- **Draws.** The model calls one tool, `show_widget`, with an HTML or SVG
  fragment; the client runs it in a sandboxed, opaque-origin `iframe` and fits
  the frame to the result. Copy it as a PNG, download it as a self-contained
  HTML file, or copy the code.
- **Keeps your history in your browser.** No account, no database, no analytics.
  Conversations live in `localStorage` and nowhere else.
- **Names your threads** with a second, cheap model call, so the sidebar is
  scannable.
- **Lets you curate models.** The catalogue is fetched live and filtered to the
  free ones; you switch on the handful you want in the picker.

## Quick start

```bash
git clone https://github.com/Kenosis01/pawzz.git
cd pawzz
bun install
cp .env.example .env      # then set OPENROUTER_API_KEY
bun run dev               # http://localhost:3000
```

You need [Bun](https://bun.sh), Node 20+, and a key from
<https://openrouter.ai/keys>. The app is free-models-only, so a key with no
credit works.

## Scripts

| Command | Does |
| --- | --- |
| `bun run dev` | development server |
| `bun run build` | production build |
| `bun run start` | serve a completed build |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | ESLint |
| `bun run check` | lint + typecheck |
| `bun run format:write` | Prettier |

## How it is put together

```
Browser ──POST /api/chat────────────► Next.js route handler ──► OpenRouter
   ▲   (transcript + model id)             (holds the API key)
   └───────── streamed UI message ────────◄─┘

localStorage  ──  conversations, name, theme, sidebar, model preference
```

- **The browser owns the conversation.** The server is stateless; it holds the
  API key and streams a reply.
- **The key never reaches the client.** It is a server-only env var, and the env
  schema fails the build if a component tries to read it.
- **The client cannot pick an arbitrary model.** Requested ids are checked
  against the same cached catalogue the UI shows.
- **Model-written code cannot reach the app.** Widgets run without
  `allow-same-origin`, behind a strict Content-Security-Policy.

There are three endpoints: `POST /api/chat`, `POST /api/chat/title` and
`GET /api/models`.

## Documentation

The full map is in **[`docs/`](./docs/README.md)**.

| Document | Covers |
| --- | --- |
| [Architecture](./docs/architecture.md) | stack, layers, request flow, security boundaries, storage |
| [Project structure](./docs/project-structure.md) | every directory and file, annotated |
| [Routes](./docs/routes.md) | every URL, what renders, what is a stub |
| [API reference](./docs/api.md) | request/response contracts for the three endpoints |
| [Chat runtime](./docs/chat-runtime.md) | streaming, persistence, editing, the two sources of truth |
| [Widgets](./docs/widgets.md) | the tool, the sandbox, the CSP, export |
| [Models](./docs/models.md) | the catalogue, the free-only guarantee, the picker |
| [Design system](./docs/design-system.md) | every token, fonts, theming |
| [Contributing](./docs/contributing.md) | setup, conventions, common tasks, deployment |
| [Status & roadmap](./docs/status.md) | what works, what is stubbed, what is missing |

## Status

Chat, streaming, widgets, persistence, models, theming, onboarding and settings
are implemented. **Projects, Co-work, Design workspaces, Search and shared links
are stubs** — the routes resolve, the surfaces are empty. Incognito, effort and
thinking are stored but do not yet change what is sent to the model.

`/api/*` has **no authentication or rate limit**; add one before exposing a
deployment publicly. See [Status & roadmap](./docs/status.md).

## Tech

Next.js 15 (App Router) · React 19 · TypeScript · Vercel AI SDK v7 · OpenRouter ·
CSS Modules + design tokens · Bun.

## License

No license file is present in this repository. Treat it as all rights reserved
until one is added.