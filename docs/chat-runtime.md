# Chat runtime

How a message gets from the prompt box to the transcript and into storage, and
why the pieces are arranged the way they are.

The central files are:

- `src/lib/use-pawzz-chat.ts` — the bridge
- `src/lib/chat-messages.ts` — the two message shapes and the translation
- `src/state/conversation.tsx` — persistence
- `src/lib/chat-handoff.ts` — the first-prompt navigation handoff

## Two sources of truth, on purpose

| Owner | Owns | Because |
| --- | --- | --- |
| the AI SDK (`useChat`) | the transcript **while a reply streams** | token-by-token updates belong to the stream; routing them through context and `localStorage` would rewrite the whole history per token |
| `ConversationProvider` | the transcript **between conversations** | it is what survives a reload and what the rest of the app renders |

They meet in exactly one place: the `onFinish` callback, where a completed reply
is committed to the store. **One write per turn.**

## Two message shapes

The app deliberately keeps two, converted at the boundary rather than bending one
to look like the other (`src/lib/chat-messages.ts`):

| Shape | Lives in | Used for |
| --- | --- | --- |
| `Message` | the store, `localStorage` | rendering the transcript |
| `UIMessage` | the AI SDK | the wire and the stream |

| Function | Direction | Notes |
| --- | --- | --- |
| `buildUserParts(text, attachments)` | outgoing | text part + one `file` part per image; folded pasted text |
| `toUIMessages(messages)` | store → SDK | rebuilds a transcript when a thread is opened |
| `fromUIMessages(messages, previous)` | SDK → store | carries `createdAt`, attachments and blocks forward |
| `uiMessageText(message)` | — | joins text parts with a blank line (`STEP_SEPARATOR`) |

`fromUIMessages` runs on **every streamed token**, so it is written to be cheap:

- it drops duplicate ids, keeping the last occurrence;
- it returns the **same object** when nothing changed, which is what makes
  `memo(MessageRow)` mean anything;
- `reuseBlocks` hands back the previous `blocks` array when the set is unchanged.

If you change this function, preserve object identity for unchanged messages —
otherwise every row of the transcript re-renders ~30 times a second.

## The send path

```ts
send(text, attachments)
  if (inFlight.current) return;        // never two prompts into one stream
  stopped.current = false;
  setInterrupted(false);
  requestTitle(text);                  // fire-and-forget
  commitUser(user);                    // durable immediately
  void sendMessage(user);              // SDK appends and requests
```

Notes that matter:

- **`commitUser` writes the user message before the reply exists.** Otherwise a
  prompt sent and then abandoned leaves no trace — no sidebar row, no message.
- **`inFlight` refuses a second send while a reply is streaming.** The SDK does
  not queue; it appends, and both the old and the new assistant message land
  twice, producing a duplicate React key. The composer also refuses, but this is
  the same guard one layer down.
- **The transport is recreated when the model changes**, because
  `DefaultChatTransport` carries `{ modelId }` in its body.

## Committing a turn

```ts
onFinish: ({ messages: finished }) => {
  if (!stopped.current) setInterrupted(false);
  replaceMessages(conversationId, fromUIMessages(finished, storedRef.current));
}
```

`replaceMessages` refuses to write when the message count is unchanged, so an
aborted or empty reply does not rewrite the store or reset the timestamps on
messages already there. It is also where the fallback title is set from the first
user message.

## Regeneration and editing

Three paths, all sharing one hazard: `setMessages` and `sendMessage` update the
same list, and `sendMessage` *appends*. Called in the same tick, the truncate and
the append can be applied to the pre-truncation list, leaving the same message
twice under one id. Each path therefore **yields a microtask** between the two.

| Action | Function | Behaviour |
| --- | --- | --- |
| Run again | `regenerate()` | truncates to just before the last user message, re-sends it |
| Edit + re-run | `regenerateFrom(id, text)` | truncates to before the edited message, re-sends the rewrite |
| Stop | `stopStream()` | aborts, sets `stopped` and `interrupted` |

`regenerate` and `regenerateFrom` read the live transcript through `liveRef`
rather than closing over `messages`, so they keep a stable identity — a callback
that changes on every token would defeat the memo on every row.

## Interruption

An interrupted reply and a finished one look identical in the transcript, and the
SDK reports the same idle status for both. Only the stop click distinguishes
them, so `stopped` (a ref, read from inside `onFinish`) and `interrupted` (state,
for rendering) are both set when the user stops.

The notice renders under the cut-short message with two actions:

- **Edit prompt** — puts the last user message back in the composer
  (`onEditPrompt` in `ConversationPage.tsx`). It deliberately does *not* resend:
  the user stopped the answer because it was going the wrong way.
- **Try again** — `regenerate()`.

## Persistence

`src/state/conversation.tsx` holds `Record<string, Conversation>` and writes it
to `localStorage` under `pawzz.conversations.v1`.

- **Conversation ids** are 8 hex characters, `crypto.getRandomValues` with a
  4-bit mask (unbiased), retried if they collide. Short enough to read aloud or
  edit by hand in a URL.
- **Message ids** are `m<counter>-<8 hex>`; only compared in memory and used as
  React keys.
- The store is **trimmed on write** to `MAX_MESSAGES` (200) from the tail, so the
  in-memory transcript stays complete for the session that produced it.
- Reads are **validated, not trusted**: a half-written or older value degrades to
  "no history" rather than a render crash.
- `named` defaults to `false` when absent, which is what lets old threads be named
  on their next prompt. `pinned` defaults to `false`.
- `initial` is for tests/embedding; when it is provided the provider skips the
  storage read.

### Title ownership

`rename` is the **model's** write path and refuses to touch a thread that is
already `named`. `setTitle` is the **user's** and always wins — a name typed into
the sidebar must not be overwritten by a naming call still in flight. This is why
`named` is a separate boolean rather than a comparison against the title: a
thread always has a title (the first line of the prompt is an immediate
fallback).

## The first-prompt handoff

`/chat` does not send. On submit it:

1. calls `ensure()` to reserve a conversation id,
2. calls `stashPending({ conversationId, text, attachments })` — a
   `sessionStorage` write under `pawzz.pending.v1`,
3. navigates to `/chat/<id>`.

`/chat/<id>` calls `takePending(id)` in an effect and sends. `takePending`
**reads and clears in one step**, so a refresh does not re-send the prompt.

The send is deferred by a microtask, and that is load-bearing: called
synchronously from the mount effect, `sendMessage` updates the transcript but the
request never leaves — the SDK's serial job executor is not yet runnable during
the mounting commit and the job is dropped silently. Yielding first lets the
commit finish.

This is also why there is exactly one sender. Two senders (the empty state and
the conversation screen) would race and the transcript would show the prompt
twice.

## Scroll behaviour

`ConversationPage` auto-scrolls to the bottom, keyed on three things: the message
count, the tail message's text, and the tail message's **blocks**. The third is
needed because a model can say "here's the chart", call the tool, then write a
one-line takeaway — the tail text barely changes while a several-hundred-pixel
frame appears above it. Keyed only on the text, the transcript holds still and
the visual arrives off-screen.

A "jump to latest" button appears when the reader has scrolled more than
`BOTTOM_SLOP` (32 px) away from the bottom.

## Errors

The route's `onError` returns a sanitised upstream message, and `useChat` exposes
it as `error`. `MessageList` renders it under the transcript rather than as a
message, so a failure is not confused with an answer.

## Streaming cost, and what keeps it linear

| Guard | Where | Why |
| --- | --- | --- |
| 32 ms render throttle | `throttle` on `useChat` | each token would otherwise re-render a Markdown body |
| `memo(MessageRow)` | `MessageList.tsx` | earlier rows cannot have changed |
| stable message identity | `fromUIMessages` | makes the memo real |
| `memo(MarkdownBody)` | `Markdown.tsx` | re-running remark/rehype per token is the most expensive thing on the page |
| `reuseBlocks` | `chat-messages.ts` | keeps `blocks` by reference |
| `liveRef` | `use-pawzz-chat.ts` | keeps callbacks stable across tokens |