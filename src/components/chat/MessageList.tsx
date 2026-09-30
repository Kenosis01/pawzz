"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "../../lib/cn";

import { timeAgo } from "../../lib/time";
import { PawzzMark } from "../brand/PawzzMark";
import { MarkdownBody } from "./Markdown";
import { Widget } from "./Widget";
import type { Message, MessageAttachment } from "../../state/conversation";
import { CopyIcon, PencilIcon, RotateCcwIcon } from "../icons/Icons";
import styles from "./MessageList.module.css";

type Props = {
  messages: Message[];
  /** Saves an inline edit. Nothing is written until the user confirms. */
  onEdit?: (message: Message, text: string) => void;
  /** Re-runs the exchange from the last prompt. */
  onRetry?: () => void;
  /** True while a reply is arriving. Suppresses the per-row actions. */
  streaming?: boolean;
  /** A failed request, rendered under the transcript rather than as a message. */
  error?: string;
  /**
   * The last reply was stopped part-way. Renders the notice under the message
   * that was cut short, with the two ways back into it.
   */
  interrupted?: boolean;
  /** Puts the prompt that produced it back into the composer for editing. */
  onEditPrompt?: () => void;
  /**
   * Sends a follow-up a widget asked for by calling `sendPrompt`.
   *
   * Threads all the way down to the row because a widget is the only thing in the
   * transcript that can start a new turn: it has no input, so the only way it can
   * ask a follow-up question is to hand the question back to the chat.
   */
  onSendPrompt?: (text: string) => void;
  /** The app's resolved theme, so widgets match the page around them. */
  isDark?: boolean;
};

/**
 * Transcript (PRD §16). The two roles are deliberately asymmetric: the user's
 * prompt is a contained object, the assistant's answer is the reading column.
 *
 * Editing happens here rather than in the prompt box. Sending a message back to
 * the composer to edit it moves the user's attention to the bottom of the screen
 * and then yanks it back to the message being changed; editing in place keeps
 * both the text and the decision next to each other.
 */
export function MessageList({
  messages,
  onEdit,
  onRetry,
  streaming,
  error,
  interrupted,
  onEditPrompt,
  onSendPrompt,
  isDark,
}: Props) {
  // The row being written to right now. Only that row's actions are suppressed:
  // an earlier turn stays editable mid-stream, and editing it is a legitimate
  // way to redirect a long answer.
  //
  // A reverse scan rather than findLastIndex, which is ES2023 and this project
  // compiles against ES2022.
  //
  // `last` is the final assistant row and always exists to be found; `live` is
  // that same row only while a reply is arriving, and is what suppresses its
  // action buttons. Keeping them separate is what lets the mark sit under the
  // last answer whether or not it is still being written.
  let last = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "assistant") {
      last = i;
      break;
    }
  }
  const live = streaming ? last : -1;

  return (
    <div className={styles.list}>
      {messages.map((message, index) => (
        <MessageRow
          key={message.id}
          message={message}
          streaming={index === live}
          isLast={index === last}
          onEdit={onEdit}
          onRetry={onRetry}
          onSendPrompt={onSendPrompt}
          isDark={isDark}
        />
      ))}

      {interrupted ? (
        <div className={styles.interrupted} role="status">
          <p className={styles.interruptedText}>
            Pawzz&apos;s response was interrupted.
          </p>
          <div className={styles.interruptedActions}>
            {onEditPrompt ? (
              <button
                type="button"
                className={styles.interruptedButton}
                onClick={onEditPrompt}
              >
                Edit prompt
              </button>
            ) : null}
            {onRetry ? (
              <button
                type="button"
                className={styles.interruptedButton}
                onClick={onRetry}
              >
                Try again
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * One message. Memoised, which only pays off because `fromUIMessages` hands back
 * the *same* object for a message that has not changed.
 *
 * During a reply the transcript re-renders roughly 30 times a second, and without
 * this every row on the page is rebuilt each time — the earlier ones cannot have
 * changed, yet their entire DOM subtree is diffed anyway. On a thread with a few
 * dozen messages that is the difference between a page that streams and a page
 * that visibly stops: the work grows with the length of the conversation while
 * the thing actually changing is a single paragraph.
 */
export const MessageRow = memo(function MessageRow({
  message,
  streaming,
  isLast,
  onEdit,
  onRetry,
  onSendPrompt,
  isDark,
}: {
  message: Message;
  streaming?: boolean;
  /** The final assistant row — carries the closing mark. */
  isLast?: boolean;
  onEdit?: (message: Message, text: string) => void;
  onRetry?: () => void;
  onSendPrompt?: (text: string) => void;
  isDark?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const stamp = timeAgo(new Date(message.createdAt));

  // Whitespace-only counts as empty: a stray newline should not leave a bubble.
  const hasText = message.text.trim().length > 0;

  // An assistant reply that drew something is rendered from its blocks; anything
  // else falls back to the single body of text.
  const blocks = message.role === "assistant" ? message.blocks : undefined;

  // Editing resets when the row stops being the one being edited, so reopening
  // never shows the previous draft.
  useEffect(() => {
    if (!editing) setDraft(message.text);
  }, [editing, message.text]);

  /**
   * Clamping applies to the user's own messages only.
   *
   * It existed so a pasted log or a long prompt did not take over the screen
   * before the user had read it — which is a decision about the *input*, and the
   * reader is the author, who already knows what it says.
   *
   * A reply is the opposite case. Clamping it hides the answer behind a control
   * whose only outcome is the answer being shown in full, and it does that
   * mid-stream, while the text is still arriving: the row measures itself as
   * overflowing on almost every tick and the "Show more" button flickers in and
   * out. An answer that is not finished cannot be summarised away, so it is
   * always shown whole.
   */
  const clampable = message.role === "user";

  // A long message is clamped, but only the text that actually overflows gets a
  // "Show more" — measured rather than guessed from length, since a short
  // message in a narrow column overflows too.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    if (!clampable || expanded) {
      setClamped(false);
      return;
    }
    setClamped(el.scrollHeight - el.clientHeight > 1);
  }, [message.text, expanded, clampable]);

  // The column width changes with the viewport, so overflow has to be re-checked
  // rather than measured once.
  useEffect(() => {
    if (expanded || !clampable) return;
    const el = textRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setClamped(el.scrollHeight - el.clientHeight > 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, clampable]);

  // Select the text on entering edit, so the first keystroke replaces rather
  // than appends — the common case is rewriting a prompt, not tweaking a word.
  // Grows with the draft: one line stays one line. A fixed minimum of three
  // rows made every edit look like a paragraph being rewritten, which is not
  // what editing a one-line prompt should feel like.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, editing]);

  useEffect(() => {
    if (!editing) return;
    const el = bodyRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  const copy = () => {
    void navigator.clipboard?.writeText(message.text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    });
  };

  const commit = () => {
    const text = draft.trim();
    // An edit that removes the text is a delete, and delete is the remove
    // action's job — not something to smuggle through a save button.
    if (!text) return;
    setEditing(false);
    if (text === message.text) return;
    onEdit?.(message, text);
  };

  if (editing) {
    return (
      <article className={styles.row} data-role={message.role}>
        <div className={styles.editWrap}>
          <div className={styles.editBlock}>
            <textarea
              ref={bodyRef}
              className={styles.editArea}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setEditing(false);
                  setDraft(message.text);
                }
                // Enter would send; the message keeps its own line breaks, so a
                // modifier is required rather than Enter being captured.
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  commit();
                }
              }}
              aria-label="Edit message"
              rows={1}
            />
          </div>

          <div className={styles.editActions}>
            <button
              type="button"
              className={styles.editButton}
              onClick={() => {
                setEditing(false);
                setDraft(message.text);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.editButton}
              onClick={commit}
              disabled={!draft.trim()}
            >
              Save
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={styles.row} data-role={message.role}>
      {message.caption ? (
        <p className={styles.caption}>{message.caption}</p>
      ) : null}

      {message.attachments?.length ? (
        <ul className={styles.attachments}>
          {message.attachments.map((attachment, index) => (
            <li
              key={attachment.id}
              className={styles.attachmentCard}
              // A lone image is the point of the message, so it is given the
              // room. Mixed with other attachments they stay chips.
              data-solo={
                message.attachments?.length === 1 && index === 0
                  ? "true"
                  : undefined
              }
            >
              <AttachmentCard attachment={attachment} />
            </li>
          ))}
        </ul>
      ) : null}

      {/* The reply, in the order the model produced it.
          Prose and visuals share one sequence because that is what the reply is:
          a model that introduces a chart, draws it and then says what it shows
          has said three things in an order, and splitting the two into "all the
          text, then all the pictures" moved the chart below the conclusion it was
          evidence for.

          A message with no blocks takes the original path — plain `text` through
          the markdown renderer — which is every user message and every reply the
          model answered without drawing. */}
      {blocks?.length ? (
        <div className={styles.body}>
          {blocks.map((block, index) =>
            block.kind === "text" ? (
              block.text.trim() ? (
                <div
                  key={`t${index}`}
                  className={styles.text}
                  ref={index === blocks.length - 1 ? textRef : undefined}
                >
                  <MarkdownBody
                    text={block.text}
                    streaming={streaming && index === blocks.length - 1}
                  />
                </div>
              ) : null
            ) : (
              <div className={styles.widgetSlot} key={`w${block.widget.id || index}`}>
                <Widget
                  widget={block.widget}
                  pending={block.pending}
                  isDark={isDark ?? false}
                  onSendPrompt={onSendPrompt}
                />
              </div>
            ),
          )}
        </div>
      ) : hasText ? (
        <>
          {/* The fade is a sibling rather than a mask on the text, so it never
              sits between the text and its own selection colour. */}
          <div className={styles.body} data-clamped={clamped && !expanded}>
            <div
              ref={textRef}
              className={styles.text}
              data-clamped={clamped && !expanded}
            >
              {/* Only the assistant is Markdown. A user message is what they
                  typed, and rendering it would mean a pasted code sample or a
                  URL re-appearing as a styled block instead of as the text they
                  sent. */}
              {message.role === "assistant" ? (
                <MarkdownBody text={message.text} streaming={streaming} />
              ) : (
                message.text
              )}
            </div>
            {clamped && !expanded ? (
              <span aria-hidden="true" className={styles.fade} />
            ) : null}
          </div>
        </>
      ) : null}

      {clamped && hasText ? (
        <button
          type="button"
          className={styles.showMore}
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}

      <div className={styles.meta}>
        <span className={styles.stamp}>{copied ? "Copied" : stamp}</span>
        <div className={styles.actions}>
          {onRetry && !streaming ? (
            <button
              type="button"
              className={styles.action}
              onClick={onRetry}
              aria-label="Run again"
              title="Run again"
              data-icon-trigger
            >
              <RotateCcwIcon size={14} />
            </button>
          ) : null}
          {/* Edit is a user-side affordance only.
              On a reply it reads as "you can rewrite what the model said", which
              is not what the control does: it rewrites the *prompt* that produced
              the reply and regenerates from there. Offering the same pencil for
              both roles makes the two look like the same action when they are
              opposite ones. */}
          {onEdit && message.role === "user" ? (
            <button
              type="button"
              className={styles.action}
              onClick={() => setEditing(true)}
              aria-label="Edit message"
              title="Edit"
              data-icon-trigger
            >
              <PencilIcon size={14} />
            </button>
          ) : null}
          <button
            type="button"
            className={styles.action}
            onClick={copy}
            aria-label="Copy message"
            title="Copy"
            data-icon-trigger
          >
            <CopyIcon size={14} />
          </button>
        </div>
      </div>

      {/* The mark closes the reply, and closes it last.
          Below the text and below the action row, because it is the end of the
          message: anything that follows it is furniture, and a signature with the
          copy button sitting on top of it reads as a watermark. It stays while
          the reply is streaming and after it finishes, since only the *motion* is
          tied to arriving — a finished answer signs off, it does not keep
          pulsing. */}
      {isLast && hasText ? (
        <span className={styles.thinking}>
          <PawzzMark
            size={46}
            className={cn(
              styles.thinkingMark,
              !streaming && styles.thinkingMarkStill,
            )}
          />
          <span className={styles.srOnly}>
            {streaming ? "Pawzz is writing a reply" : "Reply from Pawzz"}
          </span>
        </span>
      ) : null}
    </article>
  );
});

/**
 * One attachment, as the transcript shows it.
 *
 * Three shapes, because they carry different information: an image is the
 * content, a pasted block is the content, and a file is only ever a name — so
 * files get a card that leads with the name and a type badge, and everything
 * else shows what was actually sent.
 */
function AttachmentCard({ attachment }: { attachment: MessageAttachment }) {
  if (attachment.kind === "image" && attachment.thumb) {
    return (
      <figure className={styles.imageCard}>
        {/* A data URL, so it is still there after a reload. next/image cannot
            help: there is no origin to optimise and no intrinsic size to infer
            before layout. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={attachment.thumb} alt={attachment.name} />
      </figure>
    );
  }

  if (attachment.kind === "text") {
    return (
      <div className={styles.pasteCard}>
        <p className={styles.pasteText}>{attachment.text ?? attachment.name}</p>
        <span className={styles.cardTag}>Pasted</span>
      </div>
    );
  }

  // An image whose thumbnail could not be made still gets the file treatment,
  // which is honest: we have the name and nothing to show.
  return (
    <div className={styles.fileCard}>
      <span className={styles.fileName}>{attachment.name}</span>
      <span className={styles.cardTag}>{typeLabel(attachment)}</span>
    </div>
  );
}

/** "KDL", "PNG", "2 kB" — the file card's badge. */
function typeLabel(attachment: MessageAttachment): string {
  const extension = attachment.name.includes(".")
    ? attachment.name.split(".").pop()
    : undefined;
  if (extension) return extension.toUpperCase().slice(0, 5);
  if (attachment.kind === "image") return "Image";
  return "File";
}
