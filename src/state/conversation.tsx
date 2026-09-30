"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { MessageWidget } from "../lib/widget";

export type Role = "user" | "assistant";

/**
 * An attachment as it survives in the transcript.
 *
 * Deliberately not the composer's own shape: that one carries a `preview` object
 * URL, and a blob URL is scoped to the document that minted it. Persisting one
 * would put a reference to a dead blob in localStorage, and the transcript would
 * come back with broken images after a reload. So the transcript keeps the
 * description and not the bytes.
 */
export type MessageAttachment = {
  id: string;
  kind: "text" | "file" | "image";
  name: string;
  text?: string;
  /**
   * Downscaled JPEG data URL. Images render as pictures in the transcript
   * rather than as filenames, which means the bytes have to outlive the tab —
   * hence a data URL instead of the composer's blob URL.
   */
  thumb?: string;
  size?: number;
};

/**
 * A visual the model drew, as it survives in storage.
 *
 * Re-exported from `lib/widget` rather than redeclared: the shell that renders
 * one and the record of one are the same thing, and two declarations of the same
 * shape would drift the first time a field was added to one of them.
 */
export type { MessageWidget };

/**
 * One renderable piece of a reply, in the order the model produced it.
 *
 * This exists because a reply is not one thing followed by some pictures. A model
 * that writes a paragraph, draws a chart, and then writes what the chart shows
 * has said three things in a specific order, and rendering that as "all the prose,
 * then all the pictures" moves the chart to the end of the reply — below the
 * conclusion it was supposed to be evidence for. The stream already interleaves
 * them; this preserves it.
 */
export type MessageBlock =
  | { kind: "text"; text: string }
  /**
   * A visual, or the promise of one.
   *
   * `pending` is the model still writing the widget's arguments. It is kept as a
   * block rather than dropped so the transcript can show that something is being
   * made *in the right place* — a skeleton at the end of the reply would move it
   * back to the bottom the moment the reply continued.
   */
  | { kind: "widget"; widget: MessageWidget; pending?: boolean };

export type Message = {
  id: string;
  role: Role;
  text: string;
  /** Small line above an assistant message: what it is doing (PRD §43). */
  caption?: string;
  /** Sent alongside the message, so the transcript shows what was asked of what. */
  attachments?: MessageAttachment[];
  /**
   * The reply as an ordered sequence of prose and visuals.
   *
   * The only record of a widget. An earlier shape kept a flat `widgets` list
   * alongside the text, and it was a second source of truth that nothing rendered
   * from — the transcript reads `blocks`, so a message carrying only `widgets`
   * drew a chart that was in storage and absent from the screen, which is the
   * worst kind of bug to chase. One field, one truth.
   *
   * Absent on a message with no widget, in which case the transcript renders
   * `text`, so this is additive and every reply without a visual is unaffected.
   */
  blocks?: MessageBlock[];
  createdAt: number;
};

export type Conversation = {
  id: string;
  title: string;
  /**
   * True once the model has named this thread.
   *
   * A separate flag rather than testing the title, because a thread always has a
   * title: the first line of the prompt is written as an immediate fallback so
   * the sidebar is never blank, and the model's better name arrives a moment
   * later. Comparing against the placeholder therefore cannot tell "not yet
   * named" from "already named by the fallback", and the model's name was being
   * discarded every time.
   */
  named: boolean;
  /**
   * Held at the top of the history list, above anything newer.
   *
   * A sticky thing the reader marked rather than a sort key: recency still
   * orders everything else, and the pin is the one entry allowed to ignore it.
   */
  pinned: boolean;
  messages: Message[];
};

type ConversationState = {
  conversations: Record<string, Conversation>;
  /**
   * False until storage has been read. The desktop build had no storage and no
   * first paint to get wrong; on the web, rendering before the read resolves
   * would show an empty transcript and flip the composer back to its full size
   * for a frame.
   */
  hydrated: boolean;
  /** Appends a user message and, if new, opens the conversation. */
  send: (
    conversationId: string,
    text: string,
    attachments?: MessageAttachment[],
  ) => void;
  /** Rewrites a message in place. Used by inline editing in the transcript. */
  edit: (conversationId: string, messageId: string, text: string) => void;
  /**
   * Reserves a fresh six-hex id and opens the conversation under it. Returns the
   * id so the caller can route to it.
   *
   * Separate from `send` because the id has to be *chosen* before the message
   * that names it: `/chat/:id` is a real address, and one that is minted per
   * message would make every message its own page.
   */
  ensure: () => string;
  /** Drops a message so it can be re-sent or edited. */
  remove: (conversationId: string, messageId: string) => void;
  /** Renames a conversation. Ignored for one the model has already named. */
  rename: (conversationId: string, title: string) => void;
  /**
   * Renames a conversation on the reader's authority, and marks it named.
   *
   * Separate from `rename` for exactly that difference: `rename` is the model's
   * write path and refuses to touch a thread that already has a name, while
   * this is the human's, and has to win — a name typed into the sidebar must not
   * be overwritten a moment later by a title call still in flight, nor by the
   * next prompt. Setting `named` is what stops both.
   */
  setTitle: (conversationId: string, title: string) => void;
  /** Pins or unpins a conversation to the top of the history list. */
  pin: (conversationId: string, pinned: boolean) => void;
  /** Drops a conversation and its transcript from the store. */
  removeConversation: (conversationId: string) => void;
  /**
   * Overwrites a conversation's transcript wholesale. Used to commit a finished
   * model reply, where the authoritative ordering lives in the AI SDK rather
   * than here.
   */
  replaceMessages: (conversationId: string, messages: Message[]) => void;
};

const ConversationContext = createContext<ConversationState | null>(null);

const STORE_KEY = "pawzz.conversations.v1";

/** A long transcript is not worth a quota error. Roughly the last 200 turns. */
const MAX_MESSAGES = 200;

function readStore(): Record<string, Conversation> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};

    // Validate rather than trust: a half-written value or an older shape should
    // degrade to "no history", never to a render crash mid-transcript.
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, value]) =>
          typeof value === "object" &&
          value !== null &&
          typeof (value as Conversation).id === "string" &&
          Array.isArray((value as Conversation).messages),
      )
      // `Object.entries` over an `object` types its values as `any`, so the
      // shape is restated here rather than carried in from the cast above.
      .map(([key, conversation]: [string, Partial<Conversation>]) => {
        // `named` defaulted to `true` here for a while, to keep old threads from
        // renaming themselves out from under the reader. That was the wrong
        // trade: it made every thread written before the flag existed permanently
        // untitled — the model could never name it, because the store insisted it
        // already had been. A missing flag now reads as "not named", which is what
        // it means, and the thread is named on its next prompt. `pinned` is newer
        // still and defaults to false when absent.
        const named =
          typeof conversation.named === "boolean" ? conversation.named : false;
        const pinned = conversation.pinned === true;
        return [
          key,
          { ...conversation, named, pinned },
        ] as [string, Conversation];
      }),
    );
  } catch {
    return {};
  }
}

function writeStore(conversations: Record<string, Conversation>): void {
  try {
    // Trimmed on the way out, not on the way in, so the in-memory transcript
    // stays complete for the session that produced it.
    const trimmed = Object.fromEntries(
      Object.entries(conversations).map(([id, conversation]) => [
        id,
        conversation.messages.length > MAX_MESSAGES
          ? {
              ...conversation,
              messages: conversation.messages.slice(-MAX_MESSAGES),
            }
          : conversation,
      ]),
    );
    localStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
  } catch {
    // Quota exceeded or storage blocked. The session still works in memory.
  }
}

/**
 * Conversation ids are eight hex characters, so a thread reads as `/chat/a3f9c2b7`.
 *
 * This was a UUID, then `c<counter>-<5 base36 chars>`, and both were wrong for
 * the same reason: they are long enough to discourage the one thing a person
 * should be willing to do with a thread, which is type or read its own URL out
 * loud. A URL is a place people visit; making it a 36-character UUID makes people
 * avoid it.
 *
 * Eight is the floor for a chat history rather than a single link. Six was fine
 * for one open thread and too short once the sidebar lists dozens of them:
 * at that size a hex string is not reliably readable aloud or editable by hand,
 * and two ids differing in one character are easy to conflate. 16^8 is 4.3
 * billion, so a clash stays a rounding error — and the claim retries rather than
 * assuming, so it cannot silently overwrite a thread.
 *
 * It is hex rather than a longer random string so the alphabet is unambiguous:
 * no `l`/`1` or `0`/`O` to mistype when a URL is edited by hand.
 */
const ID_LENGTH = 8;

const HEX_DIGITS = [...new Uint8Array(16).keys()].map((n) =>
  n.toString(16),
);

function randomHex(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  // Masked to 4 bits rather than reduced modulo 16: 256 is divisible by 16, so
  // the mask is not biased and no digit is ever over-represented.
  return Array.from(bytes, (byte) => HEX_DIGITS[byte & 0x0f] ?? "0").join(
    "",
  );
}

/**
 * Message ids keep the longer shape. A conversation is identified by a URL a
 * person might read, but a message id is only ever compared in memory and
 * written into React keys, where the wider space is free collision insurance
 * for a long transcript.
 */
let counter = 0;
const nextMessageId = () =>
  `m${++counter}-${randomHex(8)}`;


/** The placeholder a freshly opened thread carries until its first prompt. */
const UNTITLED = "New conversation";

/** First line of the prompt becomes the title, the way a chat list would read. */
function titleFrom(text: string): string {
  const line = text.trim().split("\n")[0] ?? "";
  return line.length > 48 ? `${line.slice(0, 48)}…` : line;
}

export function ConversationProvider({
  children,
  /** Seed state, e.g. hydrated from storage on launch. */
  initial,
}: {
  children: ReactNode;
  initial?: Record<string, Conversation>;
}) {
  const [conversations, setConversations] = useState<
    Record<string, Conversation>
  >(initial ?? {});
  const [hydrated, setHydrated] = useState(false);

  // Skips the initial empty write, so mounting never clobbers the store with
  // the pre-hydration state.
  const loaded = useRef(false);

  useEffect(() => {
    if (initial) {
      loaded.current = true;
    } else {
      setConversations(readStore());
      loaded.current = true;
    }
    setHydrated(true);
  }, [initial]);

  useEffect(() => {
    if (!loaded.current) return;
    writeStore(conversations);
  }, [conversations]);

  const ensure = useCallback(() => {
    // Retries rather than trusting the draw. Six hex digits colliding is
    // unlikely, but "unlikely" is not an acceptable reason to overwrite
    // somebody's transcript, and the check is free.
    let id = randomHex(ID_LENGTH);
    for (let attempt = 0; id in conversations; attempt++) {
      if (attempt > 8) {
        // Unreachable in practice — 16.7M ids. If it ever happens, the store is
        // in a state worth surfacing rather than papering over.
        throw new Error("Could not allocate a conversation id");
      }
      id = randomHex(ID_LENGTH);
    }
    setConversations((current) => ({
      ...current,
      [id]: { id, title: UNTITLED, named: false, pinned: false, messages: [] },
    }));
    return id;
  }, [conversations]);

  const send = useCallback(
    (
      conversationId: string,
      text: string,
      attachments?: MessageAttachment[],
    ) => {
      const message: Message = {
        id: nextMessageId(),
        role: "user",
        text,
        attachments: attachments?.length ? attachments : undefined,
        createdAt: Date.now(),
      };
      setConversations((current) => {
        const existing = current[conversationId];
        // A thread opened by `ensure()` is still carrying its placeholder title,
        // so the first prompt is what names it. Without this the sidebar listed
        // every conversation as "New conversation" — the title was only ever set
        // on the branch that creates a thread, and the empty state always creates
        // one first, so that branch was unreachable in practice.
        const untitled = !existing || existing.title === UNTITLED;
        const next: Conversation = {
          ...(existing ?? {
            id: conversationId,
            messages: [],
            named: false,
            pinned: false,
          }),
          title: untitled ? titleFrom(text) : existing.title,
          messages: [...(existing?.messages ?? []), message],
        };
        return { ...current, [conversationId]: next };
      });
    },
    [],
  );

  // In place, not remove-and-reappend: editing should not reorder the thread or
  // change where the message sits.
  const edit = useCallback(
    (conversationId: string, messageId: string, text: string) => {
      setConversations((current) => {
        const conversation = current[conversationId];
        if (!conversation) return current;
        return {
          ...current,
          [conversationId]: {
            ...conversation,
            messages: conversation.messages.map((message) =>
              message.id === messageId
                ? { ...message, text, createdAt: Date.now() }
                : message,
            ),
          },
        };
      });
    },
    [],
  );

  const remove = useCallback((conversationId: string, messageId: string) => {
    setConversations((current) => {
      const conversation = current[conversationId];
      if (!conversation) return current;
      return {
        ...current,
        [conversationId]: {
          ...conversation,
          messages: conversation.messages.filter(
            (message) => message.id !== messageId,
          ),
        },
      };
    });
  }, []);

  /**
   * Replaces the whole transcript of a conversation in one write.
   *
   * The store is the persistence layer, not the render layer: while a reply is
   * streaming, the transcript is drawn from the AI SDK's own in-flight message
   * array, and the finished result is committed here once. Writing on every
   * token instead would mean a `localStorage.setItem` of the entire history per
   * token — the transcript grows while it streams, so that is quadratic, and it
   * is the kind of cost that shows up as the message arriving in stutter.
   *
   * `createdAt` is carried across from the previous state rather than stamped
   * fresh, so opening a thread does not make every message in it look new.
   */
  const replaceMessages = useCallback(
    (conversationId: string, messages: Message[]) => {
      setConversations((current) => {
        const existing = current[conversationId];
        if (!existing) return current;
        // Nothing new to say: an aborted or empty reply must not rewrite the
        // stored transcript or reset the clock on messages already there.
        if (existing.messages.length === messages.length) return current;

        // The title is set here rather than in `send` because this is the path a
        // turn actually takes: the empty state reserves the id, the conversation
        // screen sends, and the finished reply is committed through this
        // function. `send` is only reached by a caller writing the store
        // directly, so a title set there would leave every real conversation
        // untitled.
        const firstUser = messages.find((message) => message.role === "user");
        const title =
          existing.title === UNTITLED && firstUser
            ? titleFrom(firstUser.text)
            : existing.title;

        return {
          ...current,
          [conversationId]: { ...existing, title, messages },
        };
      });
    },
    [],
  );

  /**
   * Renames a thread.
   *
   * Refuses to overwrite a name the model has produced. A title is requested
   * once per conversation, but a late response can arrive after a second request
   * has already landed, and a race that lets the older answer win shows a thread
   * renaming itself a moment after it settled.
   */
  const rename = useCallback((conversationId: string, title: string) => {
    setConversations((current) => {
      const existing = current[conversationId];
      if (!existing || existing.named) return current;
      return {
        ...current,
        [conversationId]: { ...existing, title, named: true },
      };
    });
  }, []);

  const setTitle = useCallback((conversationId: string, title: string) => {
    setConversations((current) => {
      const existing = current[conversationId];
      if (!existing) return current;
      return {
        ...current,
        [conversationId]: { ...existing, title, named: true },
      };
    });
  }, []);

  const pin = useCallback((conversationId: string, pinned: boolean) => {
    setConversations((current) => {
      const existing = current[conversationId];
      if (!existing || existing.pinned === pinned) return current;
      return { ...current, [conversationId]: { ...existing, pinned } };
    });
  }, []);

  const removeConversation = useCallback((conversationId: string) => {
    setConversations((current) => {
      if (!(conversationId in current)) return current;
      const next = { ...current };
      delete next[conversationId];
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      conversations,
      hydrated,
      send,
      edit,
      ensure,
      remove,
      replaceMessages,
      rename,
      setTitle,
      pin,
      removeConversation,
    }),
    [
      conversations,
      hydrated,
      send,
      edit,
      ensure,
      remove,
      replaceMessages,
      rename,
      setTitle,
      pin,
      removeConversation,
    ],
  );

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversations(): ConversationState {
  const value = useContext(ConversationContext);
  if (!value)
    throw new Error(
      "useConversations must be used inside ConversationProvider",
    );
  return value;
}
