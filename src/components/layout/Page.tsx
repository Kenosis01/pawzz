"use client";

import type { ReactNode } from "react";

import styles from "./Page.module.css";

/**
 * Page surface: a flex column that fills its parent.
 *
 * `pinned` is for a surface with a fixed region at one end — a transcript with
 * the composer docked below it. The page then must not scroll itself, because a
 * page that scrolls carries the pinned region away with it: the prompt box rides
 * up the screen and off the top, and the page turns into a document that happens
 * to contain a composer. Scrolling belongs to the transcript, which is the only
 * part that is allowed to grow.
 *
 * Left off everywhere else, where the page scrolling is the correct behaviour.
 */
export function Page({
  children,
  pinned = false,
}: {
  children?: ReactNode;
  pinned?: boolean;
}) {
  return (
    <div className={styles.page} data-pinned={pinned ? "true" : undefined}>
      {children}
    </div>
  );
}
