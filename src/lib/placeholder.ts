"use client";

/**
 * The prompt placeholder.
 *
 * Derived from state rather than fixed, because a prompt box that says the same
 * four words forever reads as a form field instead of an invitation. Three
 * cases cover the ones the user can actually be in:
 *
 *  - a new chat: the open invitation
 *  - a thread with a transcript: a follow-up, because the empty-one-liner case
 *    is not where a first question gets asked
 *  - files attached: the prompt is now about those files
 *
 * Deliberately deterministic. Rotating through variations at random looks
 * restless, and picking one on the server would disagree with the client and
 * trip a hydration mismatch on every load.
 */
export function placeholderFor({
  hasMessages,
  attachmentCount,
}: {
  hasMessages: boolean;
  attachmentCount: number;
}): string {
  if (attachmentCount > 0) {
    return attachmentCount === 1 ? "Ask about this file…" : "Ask about these files…";
  }
  if (hasMessages) return "Ask a follow-up…";
  return "Hey, how can I help you today?";
}
