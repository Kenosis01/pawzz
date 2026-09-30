"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import styles from "./ConfirmDialog.module.css";

/**
 * A yes/no gate in front of an action that cannot be undone.
 *
 * Through a portal onto the body, because the trigger is almost always a
 * control inside a panel that clips its own overflow — the chat menu lives in
 * the sidebar's scrolling history list — and a dialog nested in there is one
 * the reader can scroll out of sight of.
 *
 * Focus opens on Cancel. The button a dialog opens on is the one a reflexive
 * Enter confirms, and asking the question is the whole point of asking it. Tab
 * is trapped for the same reason, while Escape and the scrim both mean no.
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const card = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // The caller hands over a fresh arrow on every render, so depending on it
  // directly would re-bind the listener on every keystroke elsewhere. The ref
  // is what stays current, and re-registering on a changed ref would do nothing
  // because the ref object itself never changes.
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      // Focus is already inside the card and there are two buttons in it, so
      // the trap is a cycle between them rather than a list to walk.
      const buttons = Array.from(
        card.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
      );
      if (buttons.length < 2) return;
      const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.shiftKey
        ? (at - 1 + buttons.length) % buttons.length
        : (at + 1) % buttons.length;
      event.preventDefault();
      buttons[next]?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return createPortal(
    <div className={styles.scrim} onMouseDown={() => onCancel()}>
      {/* A press inside the card must not reach the scrim, which means no: the
          backdrop is a target in its own right, and "release over the dialog"
          is not a thing anyone is trying to do. */}
      <div
        ref={card}
        className={styles.card}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={children ? bodyId : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>
        {children ? (
          <p className={styles.body} id={bodyId}>
            {children}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button
            ref={cancelRef}
            type="button"
            className={styles.button}
            onClick={() => onCancel()}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.buttonDanger}
            onClick={() => onConfirm()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
