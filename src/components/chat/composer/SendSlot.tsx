"use client";

import { ArrowUpIcon, MicIcon } from "../../icons/Icons";
import { cn } from "../../../lib/cn";
import styles from "../Composer.module.css";

/**
 * The mic, send and stop control, which share one slot.
 *
 * Three controls in one fixed-width box rather than one control that changes
 * meaning. The width is the point: the field must not shift under the caret
 * while someone types, and the box must not resize when a reply starts
 * streaming, so all three states are the same 2rem and swap inside it.
 *
 * While a reply is streaming the group is replaced rather than layered. A send
 * button that cannot do anything is worse than no send button.
 */
export function SendSlot({
  canSend,
  streaming,
  onSend,
  onStop,
}: {
  canSend: boolean;
  streaming: boolean;
  onSend: () => void;
  onStop?: () => void;
}) {
  return (
    <span className={styles.slot}>
      {streaming ? (
        <button
          type="button"
          className={styles.stopSquare}
          onClick={onStop}
          aria-label="Stop generating"
          title="Stop generating"
        >
          <span aria-hidden="true" className={styles.stopGlyph} />
        </button>
      ) : (
        <>
          <button
            type="button"
            className={cn(styles.square, canSend && styles.squareHidden)}
            disabled
            title="Voice input is not wired up yet"
            aria-label="Voice input (not available yet)"
            aria-hidden={canSend}
            tabIndex={canSend ? -1 : 0}
            data-icon-trigger
          >
            <MicIcon size={16} />
          </button>
          <button
            type="button"
            className={cn(styles.send, !canSend && styles.sendHidden)}
            onClick={onSend}
            aria-hidden={!canSend}
            tabIndex={canSend ? 0 : -1}
            aria-label="Send message"
            data-icon-trigger
          >
            <ArrowUpIcon size={16} />
          </button>
        </>
      )}
    </span>
  );
}
