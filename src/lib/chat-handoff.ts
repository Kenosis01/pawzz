"use client";

import type { Attachment } from "../components/chat/Composer";

/**
 * Handing the first prompt from the empty state to the conversation screen.
 *
 * `/chat` mints the conversation and navigates; `/chat/:id` sends. The prompt
 * has to survive that navigation, and there are exactly two ways to do it: in
 * React state above the route change, or in storage. The route change crosses a
 * boundary that re-mounts everything, so it is storage — `sessionStorage`,
 * because this is a value that matters for one navigation and is worthless the
 * moment the tab is closed. A draft that outlived the tab would be a prompt
 * someone forgot they wrote.
 *
 * Read-and-clear in a single step. Leaving it behind would re-send the prompt on
 * every refresh of the thread, which is the kind of bug that only shows up after
 * someone has walked away.
 */

const PENDING_KEY = "pawzz.pending.v1";

export type Pending = {
  conversationId: string;
  text: string;
  attachments?: Attachment[];
};

export function stashPending(pending: Pending): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // Blocked or full storage: the prompt itself is a string and is still
    // delivered by the caller, so this costs the attachments and nothing else.
  }
}

/** Takes the handoff if it belongs to this conversation, and consumes it. */
export function takePending(conversationId: string): Pending | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_KEY);

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const pending = parsed as Pending;
    // Validated rather than trusted: storage is editable from devtools, and this
    // value is about to become a prompt sent to a paid API.
    if (typeof pending.text !== "string") return null;
    if (pending.conversationId !== conversationId) return null;
    if (
      pending.attachments !== undefined &&
      !Array.isArray(pending.attachments)
    ) {
      return null;
    }
    return pending;
  } catch {
    return null;
  }
}
