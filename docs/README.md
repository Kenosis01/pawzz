# Pawzz documentation

This directory is the map of the repository. It is written for two readers: a
human contributing to the project, and an agent asked to make a change without
being told how the code is laid out.

Every document states what exists **today**, and says so plainly when something
does not exist yet. Where a feature is a placeholder, it is named as one — see
[Status](./status.md) for the full list.

## Start here

| If you want to… | Read |
| --- | --- |
| Understand how the app is put together | [Architecture](./architecture.md) |
| Find a file and know what it does | [Project structure](./project-structure.md) |
| Know what every URL renders | [Routes](./routes.md) |
| Work on the API endpoints | [API reference](./api.md) |
| Work on the chat / streaming / persistence | [Chat runtime](./chat-runtime.md) |
| Work on model-generated visuals | [Widgets](./widgets.md) |
| Work on the model catalogue or picker | [Models](./models.md) |
| Change colours, type, spacing or theming | [Design system](./design-system.md) |
| Set up a dev environment and open a PR | [Contributing](./contributing.md) |
| Know what is built and what is stubbed | [Status & roadmap](./status.md) |

## In one paragraph

Pawzz is a Next.js 15 (App Router) web client for a chat assistant. The browser
holds the whole conversation locally — there is no account and no server-side
database. A single server route, `POST /api/chat`, holds the OpenRouter API key
and proxies the model stream; a second, `POST /api/chat/title`, asks the model
to name a thread; a third, `GET /api/models`, serves a cached catalogue of the
free models OpenRouter publishes. The interesting part of the product is that the
model can draw: a tool call carries an HTML or SVG fragment which the client runs
inside a sandboxed, opaque-origin `iframe`.

## Conventions used in these docs

- Paths are relative to the repository root.
- `~/*` is the TypeScript path alias for `./src/*` (see `tsconfig.json`).
- Code references name the symbol, e.g. `usePawzzChat` in
  `src/lib/use-pawzz-chat.ts`.
- "Stub" means the route or component exists and resolves, but renders an empty
  surface — not an error.