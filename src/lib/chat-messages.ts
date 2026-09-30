import type { TextUIPart, UIMessage } from "ai";

import type {
  Message,
  MessageAttachment,
  MessageBlock,
  MessageWidget,
} from "../state/conversation";
import { WIDGET_TOOL } from "./widget";

/**
 * Translation between the two message shapes in the app.
 *
 * The transcript persists `Message` — a row with `text`, `attachments` and a
 * timestamp, which is what the transcript renders and what localStorage holds.
 * The AI SDK speaks `UIMessage` — a row with a list of typed `parts`, which is
 * what streaming produces and what the route consumes.
 *
 * They are converted at the boundary rather than one being bent to look like the
 * other. The store's shape is a rendering concern and the SDK's is a wire
 * concern; a single shared shape would have to be either, and both are wrong for
 * the other.
 */

/** How much of a pasted block is carried to the model. */
const ATTACHMENT_TEXT_LIMIT = 8000;

/** The text of a message, with every text part joined. */
export function uiMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is TextUIPart => part.type === "text")
    .map((part) => part.text)
    .join(STEP_SEPARATOR)
    .trim();
}

/**
 * What goes between two text parts of the same message.
 *
 * A blank line, and it has to be one. The SDK emits a separate text part per
 * step, so a reply that called a tool and then commented on the result arrives as
 * two parts — and joining them with nothing welded the sentences together:
 * "recovered to 15 in Q4" ran straight into "Revenue swung hard across the
 * year", with no space. It read as a bug in the model's punctuation and was in
 * fact a bug here.
 *
 * Blank rather than single because these are separate blocks of the model's
 * output, not a wrapped line. Markdown turns it into a paragraph break, which is
 * what two steps of prose are.
 */
const STEP_SEPARATOR = "\n\n";

/**
 * The parts for an outgoing user prompt: the text, plus any image as a real
 * file part.
 *
 * Shared by the initial send and by a re-send after editing, because both have
 * to produce byte-identical prompts — a rewrite that quietly dropped the
 * attachment would look like the edit changed the model's answer.
 */
export function buildUserParts(
  text: string,
  attachments?: MessageAttachment[],
): UIMessage["parts"] {
  const parts: UIMessage["parts"] = [];

  for (const attachment of attachments ?? []) {
    if (attachment.kind === "image" && attachment.thumb) {
      parts.push({
        type: "file",
        mediaType: "image/jpeg",
        // Already a data URL: the composer downscaled it to a JPEG when it was
        // attached, specifically so the bytes could survive here.
        url: attachment.thumb,
      });
    }
  }

  const body = withAttachmentText(text, attachments);
  parts.unshift({ type: "text", text: body });
  return parts;
}

/**
 * Store → SDK.
 */
export function toUIMessages(messages: Message[]): UIMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts:
      message.role === "user"
        ? buildUserParts(message.text, message.attachments)
        : [{ type: "text", text: message.text, state: "done" as const }],
  }));
}

/**
 * Folds pasted text into the prompt, under the typed text and clearly marked.
 *
 * A pasted block is already text, so it does not become its own part: a part
 * would read to the model as something the user said separately, and the point
 * of a paste is usually that it *is* what was said.
 *
 * Images take the opposite treatment, in `buildUserParts` — those become file
 * parts, because that is the difference between the model seeing a screenshot
 * and being told a file is named "screenshot.png".
 */
function withAttachmentText(
  text: string,
  attachments?: MessageAttachment[],
): string {
  const pastes = (attachments ?? []).filter(
    (attachment) => attachment.kind === "text" && attachment.text,
  );
  if (!pastes.length) return text;

  const blocks = pastes.map((attachment) => {
    const content = attachment.text ?? "";
    const clipped =
      content.length > ATTACHMENT_TEXT_LIMIT
        ? `${content.slice(0, ATTACHMENT_TEXT_LIMIT)}\n…(truncated)`
        : content;
    return `Pasted text — ${attachment.name}:\n"""\n${clipped}\n"""`;
  });

  return [text, ...blocks].filter((part) => part.trim()).join("\n\n");
}

/**
 * SDK → store.
 *
 * `previous` supplies the parts the SDK does not model: `createdAt`, and the
 * attachment cards. An attachment is never re-derived from a part, because the
 * store's version carries a name and a display size that the wire format does
 * not, and because re-deriving would drop a pasted block's original text.
 */
export function fromUIMessages(
  messages: UIMessage[],
  previous: Message[],
): Message[] {
  const byId = new Map(previous.map((message) => [message.id, message]));

  // Two messages sharing an id would be two children with the same key, which
  // React refuses to render and warns about. That is not cosmetic: with duplicate
  // keys React may drop or duplicate rows, and the transcript stops matching what
  // the store holds.
  //
  // It should not happen — the truncation-and-resend paths yield before they
  // append, precisely so a message cannot be re-added to a list it is still in.
  // But the SDK owns this list, and a warning that fires in production naming an
  // id nobody can trace is worse than a defensive fold here.
  //
  // The *last* occurrence wins, matching what the rest of the app already assumes
  // about a re-sent message: the newest content for an id is the live one, and the
  // earlier entry is the leftover of the same send.
  const list = withoutDuplicateIds(messages);

  return list.map((message, index) => {
    const existing = byId.get(message.id);
    // Positional fallback: a message the SDK minted has no stored counterpart,
    // and ordering is enough to carry a timestamp forward.
    const template = existing ?? previous[index];

    // Ordered the way the model said it. Falls back to the stored blocks on a
    // reload, where the SDK message has been rebuilt from text alone and would
    // otherwise collapse a three-part reply into prose-then-charts.
    const blocks = uiBlocks(message.parts);
    const resolved = blocks.length
      ? reuseBlocks(blocks, template?.blocks)
      : template?.blocks;

    const next: Message = {
      id: message.id,
      role: message.role === "assistant" ? "assistant" : "user",
      text: uiMessageText(message),
      attachments: template?.attachments,
      blocks: resolved,
      createdAt: template?.createdAt ?? Date.now(),
    };

    // Hand back the object we already had whenever nothing about it changed.
    //
    // This function runs on every streamed token — it is how the live transcript
    // becomes the shape the rest of the app reads — and returning a fresh object
    // for all of them gave every message a new identity 30 times a second. Row
    // memoisation is then worth nothing: the prop it compares against is a
    // different object each time, so all 60 rows still re-render on every token.
    //
    // Only a genuinely changed message gets a new object, which is what makes
    // `memo(MessageRow)` mean anything at all. `blocks` is compared by reference,
    // which only works because `reuseBlocks` hands back the previous array
    // whenever the set is unchanged.
    if (existing) {
      const same =
        existing.role === next.role &&
        existing.text === next.text &&
        existing.attachments === next.attachments &&
        existing.blocks === next.blocks &&
        existing.createdAt === next.createdAt;
      if (same) return existing;
    }

    return next;
  });
}

/**
 * Drops earlier messages that share an id with a later one.
 *
 * Scans backwards and keeps the first id it meets, so the surviving message for
 * any id is the last one in the list. A single pass in the common case: the
 * `filter` only runs when a duplicate is actually found, which in correct
 * operation is never.
 */
function withoutDuplicateIds(messages: UIMessage[]): UIMessage[] {
  const seen = new Set<string>();
  const drop = new Set<number>();

  for (let i = messages.length - 1; i >= 0; i--) {
    const id = messages[i]?.id;
    if (id === undefined) continue;
    if (seen.has(id)) drop.add(i);
    else seen.add(id);
  }

  if (!drop.size) return messages;
  return messages.filter((_, index) => !drop.has(index));
}

/** Shared empty result. Never mutated — see `uiBlocks`. */
const NO_BLOCKS: MessageBlock[] = [];

/**
 * The reply as an ordered sequence of prose and visuals.
 *
 * The stream's parts are already in the order the model produced them, which is
 * the only place that order exists: the moment they are split into "the text" and
 * "the pictures", the position of a picture in the sentence that introduced it is
 * gone, and every widget ends up after every paragraph.
 *
 * Consecutive text parts merge. The SDK emits one per step, and a reply that
 * renders its own paragraphs as separate markdown blocks gets vertical gaps
 * between them that the model never asked for — the same reason a blank line
 * between two paragraphs of prose is not a paragraph break mid-flow.
 *
 * Returns nothing for a message with no widget, which is the overwhelming
 * majority, so the common path costs one scan and no allocation.
 */
function uiBlocks(parts: UIMessage["parts"]): MessageBlock[] {
  const tag = `tool-${WIDGET_TOOL}`;
  if (!parts.some((part) => part.type === tag)) return NO_BLOCKS;

  const blocks: MessageBlock[] = [];
  let pendingText = "";

  const flush = () => {
    if (!pendingText) return;
    blocks.push({ kind: "text", text: pendingText });
    pendingText = "";
  };

  for (const part of parts) {
    if (part.type === "text") {
      pendingText = pendingText ? pendingText + STEP_SEPARATOR + part.text : part.text;
      continue;
    }
    if (part.type !== tag) continue;

    // A call whose arguments are still arriving becomes a placeholder, so the
    // skeleton appears where the chart will be. The partial code is not
    // rendered: it grows a few characters at a time, and rebuilding the document
    // on each of them would restart the frame's animation continuously.
    if (part.state === "input-streaming") {
      flush();
      blocks.push({ kind: "widget", widget: PENDING_WIDGET, pending: true });
      continue;
    }
    if (part.state !== "input-available" && part.state !== "output-available") {
      continue;
    }

    const input = part.input;
    if (!input || typeof input !== "object") continue;
    const { title, widget_code: code, loading_messages: loading } =
      input as Record<string, unknown>;
    if (typeof title !== "string" || !title) continue;
    if (typeof code !== "string" || !code.trim()) continue;

    flush();
    blocks.push({
      kind: "widget",
      widget: {
        id: part.toolCallId,
        title,
        code,
        loadingMessages: Array.isArray(loading)
          ? loading.filter((entry): entry is string => typeof entry === "string")
          : undefined,
      },
    });
  }

  flush();
  return blocks;
}

/** The stand-in rendered for a call that has not finished arriving. */
const PENDING_WIDGET: MessageWidget = { id: "", title: "", code: "" };

/**
 * Returns `previous` when `next` describes the same blocks.
 *
 * The same contract as the message identity check above, and for the same reason:
 * this runs on every token for every message, and a fresh array here would fail
 * that check for the rest of the turn, so every finished row containing a chart
 * would re-render thirty times a second.
 */
function reuseBlocks(
  next: MessageBlock[],
  previous: MessageBlock[] | undefined,
): MessageBlock[] | undefined {
  if (!previous) return next.length ? next : undefined;
  if (previous.length !== next.length) return next;

  const same = next.every((block, index) => {
    const before = previous[index];
    if (before?.kind !== block.kind) return false;
    if (block.kind === "text" && before.kind === "text") {
      return before.text === block.text;
    }
    if (block.kind === "widget" && before.kind === "widget") {
      return (
        before.pending === block.pending &&
        before.widget.id === block.widget.id &&
        before.widget.code === block.widget.code &&
        before.widget.title === block.widget.title
      );
    }
    return false;
  });

  return same ? previous : next;
}
