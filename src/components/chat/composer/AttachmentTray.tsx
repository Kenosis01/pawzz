"use client";

import { XIcon, PaperclipIcon } from "../../icons/Icons";
import { readableSize, type Attachment } from "./attachments";
import styles from "../Composer.module.css";

/**
 * The row of pending attachments above the prompt field.
 *
 * Collapses to zero height when empty, so the box only grows when there is
 * something to show. Every tile is dismissable: an attachment is a decision, and
 * a file that got picked up by a stray drag is the one thing here the user must
 * always be able to take back.
 */
export function AttachmentTray({
  attachments,
  onRemove,
}: {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className={styles.tray}
      data-open={attachments.length > 0}
      aria-hidden={attachments.length === 0}
    >
      <div className={styles.trayInner}>
        {attachments.length ? (
          <ul className={styles.trayList}>
            {attachments.map((attachment) => (
              <li key={attachment.id} className={styles.attachment}>
                {attachment.kind === "image" && attachment.preview ? (
                  // A blob: URL minted in this tab. next/image cannot
                  // optimise it — no origin to fetch, no intrinsic size to
                  // infer, no cache beyond the tab.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className={styles.attachmentImage}
                    src={attachment.preview}
                    alt=""
                  />
                ) : attachment.kind === "text" ? (
                  <>
                    <p className={styles.attachmentText}>{attachment.text}</p>
                    <span className={styles.attachmentTag}>Pasted</span>
                  </>
                ) : (
                  <span className={styles.attachmentFile}>
                    <PaperclipIcon size={20} />
                    <span className={styles.attachmentName}>
                      {attachment.name}
                    </span>
                    {readableSize(attachment.size) ? (
                      <span className={styles.attachmentSize}>
                        {readableSize(attachment.size)}
                      </span>
                    ) : null}
                  </span>
                )}

                <button
                  type="button"
                  className={styles.attachmentClose}
                  onClick={() => onRemove(attachment.id)}
                  aria-label={`Remove ${attachment.name}`}
                >
                  <XIcon size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
