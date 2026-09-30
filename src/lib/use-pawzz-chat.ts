"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

import { takePending } from "./chat-handoff";
import { buildUserParts, fromUIMessages, toUIMessages } from "./chat-messages";
import { useModelPreference } from "./model-preference";
import type { MessageAttachment } from "../state/conversation";
import { useConversations } from "../state/conversation";

/**
 * Ids for messages the browser mints, before the server has seen them.
 *
 * A counter rather than a timestamp: `Date.now().toString(36)` collides for two
 * sends in the same millisecond, and a duplicate id is not a cosmetic problem —
 * React drops one of the two rows and the transcript silently loses a message.
 */
let localSeq = 0;
const localMessageId = () => `local-${Date.now().toString(36)}-${++localSeq}`;

/** Milliseconds between transcript renders while a reply streams. */
const STREAM_THROTTLE_MS = 32;

/**
 * One conversation's live transcript, bridged between the store and the AI SDK.
 *
 * Two sources of truth, deliberately, each owning what it is good at:
 *
 *   - `useChat` owns the transcript *while it is happening*. Token-by-token
 *     updates belong to the stream, and routing them through React context and
 *     localStorage would mean rewriting the whole history on every token.
 *   - the store owns the transcript *between* conversations. It is what survives
 *     a reload, what a reopened thread reads, and what the rest of the app sees.
 *
 * They meet in exactly one place: `onFinish`, where a completed reply is
 * committed to the store. One write per turn.
 *
 * The model travels as our own catalogue id, not the provider's, and the route
 * resolves it — so a client cannot aim the key at a model this app does not
 * offer, and renaming a model upstream never invalidates a stored preference.
 */
export function usePawzzChat(conversationId: string) {
  const { conversations, hydrated, replaceMessages, rename } =
    useConversations();
  const { model } = useModelPreference();

  /**
   * True when the last reply was cut short by the user rather than finishing.
   *
   * Not derivable from the message itself: an interrupted reply and a finished
   * one both end mid-sentence from the transcript's point of view, and the SDK
   * reports the same idle status for both. Only the stop click distinguishes
   * them, so it is recorded here at the moment it happens and cleared when a new
   * turn starts.
   */
  const [interrupted, setInterrupted] = useState(false);
  /**
   * A ref as well as the state, because `onFinish` runs when a stream *ends* —
   * including when it ends because the user stopped it. Reading the state from
   * inside `onFinish` would mean clearing the flag on the same tick it was set,
   * so the notice appeared and vanished in one frame. The ref is read through
   * the closure the SDK captured, so it always sees the current value.
   */
  const stopped = useRef(false);

  const stored = conversations[conversationId];
  const storedMessages = useMemo(() => stored?.messages ?? [], [stored]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        // Relative, so the same build works on localhost, a preview domain and
        // production without a base URL to configure.
        api: "/api/chat",
        body: { modelId: model.id },
      }),
    [model.id],
  );

  // The transcript as it is *now*, for persisting on completion. A ref rather
  // than a dependency, because `onFinish` is captured once by the `Chat`
  // instance and a closure over a stale transcript would persist a truncated
  // history.
  const storedRef = useRef(storedMessages);
  storedRef.current = storedMessages;


  const { messages, sendMessage, status, stop, error, setMessages } = useChat({
    id: conversationId,
    transport,
    /**
     * Caps how often the transcript re-renders while a reply streams.
     *
     * The server paces the words, but each arriving word still costs a full
     * render of the message, and the assistant body is Markdown — so every
     * token re-runs remark, rehype and the syntax highlighter over the whole
     * answer so far. Left unthrottled that is the burst made worse: the text
     * appears in visible jumps and the main thread is busy enough to drop the
     * frames that would have shown it moving.
     *
     * 32ms is two frames at 60Hz. Anything higher and the movement stops being
     * continuous, which is the entire point of smoothing it.
     */
    throttle: STREAM_THROTTLE_MS,
    onFinish: ({ messages: finished }) => {
      // Only clear on a turn that finished on its own. An aborted one keeps the
      // notice: the reply really was cut short, and that is worth saying.
      if (!stopped.current) setInterrupted(false);
      replaceMessages(
        conversationId,
        fromUIMessages(finished, storedRef.current),
      );
    },
  });

  /**
   * Writes the user's own message to the store straight away.
   *
   * Without this the transcript is only persisted when a reply *finishes*, which
   * means a prompt sent and then abandoned — navigated away from, or stopped
   * before the model said anything — leaves no trace at all. The thread does not
   * appear in the sidebar and the prompt is gone, which is the one thing someone
   * who typed something did not expect to happen.
   *
   * The reply then overwrites this with the full transcript, so the store ends up
   * in the same place either way; committing early just means the user's words
   * are durable from the moment they are sent.
   */
  const commitUser = useCallback(
    (user: UIMessage) => {
      replaceMessages(
        conversationId,
        fromUIMessages([...liveRef.current, user], storedRef.current),
      );
    },
    [conversationId, replaceMessages],
  );

  // The SDK's live array, readable from callbacks that are not re-created when
  // it changes.
  const liveRef = useRef(messages);
  liveRef.current = messages;

  /**
   * Asks the model to name the thread, once.
   *
   * Fire-and-forget: the thread already has a working title (the first line of
   * the prompt) and this replaces it a moment later, so nothing waits on it and
   * nothing is shown while it runs.
   *
   * Two guards, because they fail in different directions. The ref stops a second
   * prompt in the *same* mount from asking again. `named` stops it after a
   * remount — the ref is per-hook-instance, and this hook is created per
   * conversation, so navigating away and back gives a fresh, empty ref. Without
   * the store check, every visit to an already-named thread would spend another
   * call to produce the name it already has.
   */
  const titled = useRef(new Set<string>());
  const alreadyNamed = stored?.named === true;
  const requestTitle = useCallback(
    (text: string) => {
      if (alreadyNamed) return;
      if (titled.current.has(conversationId)) return;
      titled.current.add(conversationId);

      const controller = new AbortController();
      // The thread's first prompt, not the message that triggered this call.
      //
      // For a brand-new thread they are the same message — the store still has
      // nothing in it, so `text` is what is used. For a thread being named late,
      // they are not: a conversation written before the store tracked `named`, or
      // one whose naming call failed the first time, is about its first prompt,
      // and the message that merely restarted the naming is not a description of
      // it. A title derived from the middle of a thread names the wrong thing.
      const source =
        storedRef.current.find((message) => message.role === "user")?.text ??
        text;
      void fetch("/api/chat/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: source.slice(0, 2000) }),
        signal: controller.signal,
      })
        .then(async (response) => {
          // A non-2xx is a *failed attempt*, not an answered one.
          //
          // Treating it as answered — which is what returning `null` and letting
          // the narrowing below fall through did — left the id in `titled`, so
          // the next prompt in the same thread was refused too. The route answers
          // 502 when the model returns nothing (Auto can hand a naming call to a
          // reasoning model that spends its whole budget thinking), and that is
          // precisely the case worth trying again. Clearing the guard here makes
          // the retry happen on the next message rather than never.
          if (!response.ok) {
            titled.current.delete(conversationId);
            return;
          }
          const payload: unknown = await response.json();
          if (typeof payload !== "object" || payload === null) {
            titled.current.delete(conversationId);
            return;
          }
          const title = (payload as { title?: unknown }).title;
          if (typeof title !== "string") {
            titled.current.delete(conversationId);
            return;
          }
          rename(conversationId, title.slice(0, 80));
        })
        .catch(() => {
          // The placeholder title stands. A thread without a good name is a
          // cosmetic problem, not a reason to surface an error to the reader.
          titled.current.delete(conversationId);
        });
    },
    [alreadyNamed, conversationId, rename],
  );

  /**
   * True while a reply is in flight, readable from callbacks that are not
   * re-created when `status` changes.
   *
   * Guarding a send against this is what keeps the transcript valid. A second
   * prompt handed to `sendMessage` while the first reply is still streaming is
   * not queued — the SDK appends it to the array the stream is already writing
   * to, both the previous assistant message and the new one land twice, and the
   * transcript renders a duplicate key. The composer refuses to send during a
   * stream; this is the same refusal one layer down, for any caller that is not
   * the composer.
   */
  const inFlight = useRef(false);
  inFlight.current = status === "submitted" || status === "streaming";

  const send = useCallback(
    (text: string, attachments?: MessageAttachment[]) => {
      if (inFlight.current) return;
      stopped.current = false;
      setInterrupted(false);
      requestTitle(text);
      const user: UIMessage = {
        id: localMessageId(),
        role: "user",
        parts: buildUserParts(text, attachments),
      };
      commitUser(user);
      void sendMessage(user);
    },
    [commitUser, sendMessage, requestTitle],
  );

  // Seeds the SDK's transcript from storage, once, after the store has read it.
  //
  // Not as `useChat({ messages })`: that is consumed by a `Chat` instance built
  // in a state initialiser, so it is read on the first render — which happens
  // before the store has touched localStorage, and would seed an empty thread
  // over the top of a real one.
  const seeded = useRef(false);
  useEffect(() => {
    if (!hydrated || seeded.current) return;
    seeded.current = true;
    if (storedRef.current.length) {
      setMessages(toUIMessages(storedRef.current));
    }
  }, [hydrated, setMessages]);

  // Sends the prompt the empty state stashed on its way here. Declared after the
  // seeding effect so the history is in place before the prompt is sent — a
  // first prompt would otherwise be the only thing the model ever saw.
  //
  // The send is deferred by a microtask, and that is load-bearing rather than
  // cosmetic. Called synchronously from this mount effect, `sendMessage` takes
  // the message — it shows up in the transcript immediately — but the request it
  // is supposed to trigger never leaves. No error, no rejection, no request in
  // devtools: the SDK builds its request through a serial job executor that is
  // not yet runnable while the mounting commit is still in flight, so the job is
  // dropped on the floor. Yielding first lets the commit finish and the job
  // actually runs.
  //
  // The same call from a click handler — every other send in the app — works
  // synchronously, which is what makes this so easy to miss: the composer's send
  // is fine and only the first message of a new thread is silent.
  useEffect(() => {
    if (!hydrated || !seeded.current) return;
    const pending = takePending(conversationId);
    if (!pending) return;
    stopped.current = false;
    setInterrupted(false);
    requestTitle(pending.text);
    const user: UIMessage = {
      id: localMessageId(),
      role: "user",
      parts: buildUserParts(pending.text, pending.attachments),
    };
    commitUser(user);
    void Promise.resolve().then(() => sendMessage(user));
  }, [hydrated, conversationId, sendMessage, commitUser, requestTitle]);

  /**
   * The transcript as the components want it. Converted during render rather
   * than mirrored into a second piece of state, because a mirror can disagree
   * with the stream and nothing would notice until the two visibly diverged.
   */
  const transcript = useMemo(
    () => fromUIMessages(messages, storedMessages),
    [messages, storedMessages],
  );

  /**
   * Re-runs the last exchange: the transcript is cut back to the user message
   * that prompted it, and that message is sent again.
   *
   * Cut rather than appended to — the point of "run again" is to replace the
   * previous answer, not to ask for a second one.
   *
   * Reads the transcript through `liveRef` rather than taking `messages` as a
   * dependency. This callback is handed to the transcript as `onRetry`, and a
   * `useCallback` that closes over the streamed transcript gets a new identity
   * on *every token* — which makes every row of the transcript look changed to
   * `React.memo`, so the whole list re-rendered 30 times a second while a reply
   * was arriving. The ref gives one stable function that still sees the current
   * transcript, because it is read at call time rather than captured.
   */
  const regenerate = useCallback(() => {
    const current = liveRef.current;
    // Reversed scan rather than findLastIndex, which is ES2023 and this project
    // compiles against ES2022.
    let index = -1;
    for (let i = current.length - 1; i >= 0; i--) {
      if (current[i]?.role === "user") {
        index = i;
        break;
      }
    }
    if (index < 0) return;
    const prompt = current[index];
    if (!prompt) return;
    setMessages(current.slice(0, index));
    // The microtask is load-bearing, and it is the same guard the pending-handoff
    // path below uses for the same reason.
    //
    // `setMessages` and `sendMessage` both update the same list, and `sendMessage`
    // appends whatever it is handed. Called in the same tick, the truncate and the
    // append are queued together and the append can be applied to the list as it
    // was *before* the truncate — leaving the prompt in the transcript twice,
    // under one id, which React then reports as two children with the same key.
    // Yielding first means the truncation has been applied before the message
    // that re-adds it is queued, so the two can never interleave.
    void Promise.resolve().then(() => sendMessage(prompt));
  }, [sendMessage, setMessages]);

  /**
   * Rewrites a message and re-runs from there. The SDK's own `regenerate` only
   * retries the final turn, which is not what editing an older prompt means.
   */
  const regenerateFrom = useCallback(
    (messageId: string, text: string) => {
      // Through `liveRef`, not as a dependency — same reason as `regenerate`:
      // closing over `messages` would hand the transcript a new `onEdit` on every
      // token and defeat the memo on every row of it.
      const current = liveRef.current;
      const index = current.findIndex((message) => message.id === messageId);
      if (index < 0) return;
      // Truncate to *before* the edited message and let `sendMessage` re-add it.
      //
      // Setting the state to `[...before, rewritten]` and then also calling
      // `sendMessage(rewritten)` put the same message in the transcript twice
      // under one id: `sendMessage` pushes whatever it is handed, and it only
      // replaces when given a `messageId` field rather than a full message.
      // Same cause as the duplicate-key warning — one message, two entries, one
      // key. Truncating and re-sending is the same shape as `regenerate`, which
      // is why one is correct and the other was not.
      const rewritten: UIMessage = {
        id: messageId,
        role: "user",
        parts: buildUserParts(text),
      };
      stopped.current = false;
      setInterrupted(false);
      setMessages(current.slice(0, index));
      commitUser(rewritten);
      // Same guard as `regenerate`: yielding keeps the truncation and the append
      // from being applied to the same pre-truncation list.
      void Promise.resolve().then(() => sendMessage(rewritten));
    },
    [sendMessage, setMessages, commitUser],
  );

  /**
   * Stop, recorded as an interruption.
   *
   * `useChat`'s own stop is passed straight through as `abort` for callers that
   * only want the abort; the flag is set here so the transcript can say why the
   * reply ended rather than leaving a truncated sentence looking like a choice
   * the model made.
   */
  const stopStream = useCallback(() => {
    stopped.current = true;
    setInterrupted(true);
    // `stop` aborts the request and is async; nothing here needs its result, and
    // the transcript is already showing the partial reply.
    void stop();
  }, [stop]);

  return {
    messages: transcript,
    send,
    status,
    streaming: status === "submitted" || status === "streaming",
    stop: stopStream,
    interrupted,
    error,
    regenerate,
    regenerateFrom,
  };
}
