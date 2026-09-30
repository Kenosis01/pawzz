# API reference

Three route handlers, all under `src/app/api`. There is no authentication on any
of them — see [Abuse surface](#abuse-surface).

The API key lives in a server-only env var (`OPENROUTER_API_KEY`, declared in
`src/env.js`). It is read by `chat/route.ts` and `chat/title/route.ts` and
appears in no request, response or client bundle.

---

## `POST /api/chat`

Streams a chat completion as a UI message stream (`toUIMessageStreamResponse`).

**File:** `src/app/api/chat/route.ts`

### Request

`Content-Type: application/json`

```jsonc
{
  "messages": [ /* UIMessage[] — required, non-empty */ ],
  "modelId": "openrouter/free"      // optional
}
```

- `messages` is validated by the AI SDK's own schema before it reaches the model.
  The handler only establishes that the field is a non-empty array.
- `modelId` is an **allowlist**, not a preference hint. If it is present and is
  not `openrouter/free`, it must appear in the cached catalogue
  (`isKnownModel`). Otherwise the request is refused. Omitting it, or sending a
  withdrawn id, falls back to Auto rather than erroring — a retired model should
  not break chat.

### Responses

| Status | Body | When |
| --- | --- | --- |
| `200` | UI message stream | normal |
| `400` | `Malformed request body.` | body is not JSON, or has no `messages` array |
| `400` | `No messages to answer.` | `messages` is empty |
| `400` | `That model is not available.` | `modelId` is not in the catalogue |

Stream errors are surfaced through the SDK's `onError` hook as sanitised text
(see `describeError`): the provider's own message, capped at 400 characters and
stripped of control characters, because it is rendered into the transcript.

### Behaviour

| Constant | Value | Effect |
| --- | --- | --- |
| `MAX_OUTPUT_TOKENS` | 16 384 | reply ceiling; also what OpenRouter pre-authorises |
| `MAX_TOOL_STEPS` | 6 | `stopWhen: isStepCount(…)` |
| `STREAM_WORD_DELAY_MS` | 12 | `smoothStream({ chunking: "word" })` — server-side pacing |

Response headers add `X-Title: Pawzz` and `HTTP-Referer: <request origin>` for
OpenRouter attribution.

### Example

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"id":"u1","role":"user",
        "parts":[{"type":"text","text":"Say OK"}]}],
       "modelId":"openrouter/free"}'
```

The body is a stream of `data: {...}` lines — `start`, `text-start`,
`text-delta`, `tool-*`, `finish`, then `data: [DONE]`.

---

## `POST /api/chat/title`

Names a conversation. A separate, cheap call, because a thread should be
readable in the sidebar without waiting for its first full reply.

**File:** `src/app/api/chat/title/route.ts`

### Request

```jsonc
{ "prompt": "the text that opened the conversation" }
```

`prompt` is truncated to 2 000 characters server-side rather than trusting the
caller: it goes into a model prompt, and the endpoint is reachable by anyone who
can reach the app.

### Responses

| Status | Body | When |
| --- | --- | --- |
| `200` | `{ "title": "Six words at most" }` | normal |
| `400` | `Malformed request body.` | body is not JSON |
| `400` | `Nothing to name.` | `prompt` is missing or blank |
| `502` | `The model did not return a title.` | model returned nothing after 2 attempts |
| `502` | `Could not name the conversation.` | upstream error |

### Behaviour

- Uses `AUTO` (`openrouter/free`) rather than a pinned model id, so a withdrawn
  model cannot break naming.
- Tries **twice** if the first attempt returns empty text — Auto can route to a
  reasoning model that spends its budget thinking.
- `maxOutputTokens: 1024` deliberately, not the ~20 a title needs: the ceiling
  must cover a reasoning model's *thinking* as well as its answer.
- `tidy()` strips quotes, a leading `Title:`/`Name:`, and caps the result at 80
  characters.

Callers treat **any non-2xx** as a failed attempt and retry on the next message
rather than marking the thread named — see the `requestTitle` callback in
`src/lib/use-pawzz-chat.ts`.

---

## `GET /api/models`

The model catalogue, proxied from OpenRouter.

**File:** `src/app/api/models/route.ts` (logic in `catalogue.ts`)

### Responses

| Status | Body | Headers |
| --- | --- | --- |
| `200` | `{ "models": Model[], "fetchedAt": number }` | `Cache-Control: public, max-age=0, s-maxage=300` |
| `503` | `Could not load the model catalogue.` | `Cache-Control: no-store` |

`Auto` (`openrouter/free`) is prepended by `catalogueForDisplay`, so it is always
first in the returned list.

A `503` is used rather than a `200` with an empty list, because the client
distinguishes "could not load" from "there are no models".

### Caching

`readCatalogue` is wrapped in Next's `unstable_cache`:

- name `["openrouter-model-catalogue", "v4"]`
- both `unstable_cache`'s `revalidate` and the inner `fetch` use **3 600 s**

The version string in the cache key matters: `unstable_cache` is keyed by name,
not by the code that fills it, so a change to the normalised *shape* or to the
filter is invisible until the key changes. Bump `CATALOGUE_VERSION` whenever you
change what `normaliseCatalog` returns.

Only **free** models that output text are kept (`normaliseCatalog` in
`src/lib/model-catalogue.ts`). The `openrouter/free` and `openrouter/auto`
routers are filtered out and the default is prepended by the caller, so it can
never render twice.

### The allowlist

`isKnownModel(id)` is what keeps the UI and the chat route honest. Both read the
same cached list, so a model the picker offers is a model the route accepts.

When the catalogue is **unreachable**, it degrades to a shape check
(`looksLikeFreeModelId` **and** `isFreeModel`) rather than refusing everything or
accepting everything. The free `:free` suffix is part of that check: accepting
any well-formed id would let a crafted request aim the key at a paid model during
a cache refetch.

---

## Abuse surface

There is no authentication, no rate limiting and no origin check on these
routes. Anyone who can reach a deployment can:

- spend the deployment's OpenRouter balance via `/api/chat` (bounded by
  `MAX_OUTPUT_TOKENS` and the free-only allowlist, but with free-tier rate
  limits shared across all callers), and
- consume a naming call via `/api/chat/title`.

Before exposing Pawzz publicly, put a rate limit or a WAF rule in front of
`/api/*`. Mitigations already present in code: the free-only allowlist, the
output-token ceiling, bounded input lengths, and `X-Title`/`HTTP-Referer`
attribution so usage is traceable.