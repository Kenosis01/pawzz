"use client";

import { cn } from "../../lib/cn";
import styles from "./PawzzMark.module.css";

/**
 * The Pawzz mark (PRD §11). One definition, used by the sidebar and the chat
 * greeting. No container — the paw is the mark.
 *
 * Motion: fades in on mount, presses on click, and lifts on hover. Nothing
 * loops; the mascot should never be permanently moving (§11).
 */
export function PawzzMark({
  size = 34,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={cn(styles.mark, className)}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <g className={styles.paw} data-icon-trigger>
        <g className={styles.toes}>
          <ellipse className={styles.toe} cx="11" cy="12" rx="2.6" ry="3.3" />
          <ellipse className={styles.toe} cx="16" cy="9.2" rx="2.6" ry="3.3" />
          <ellipse className={styles.toe} cx="21" cy="12" rx="2.6" ry="3.3" />
          <ellipse className={styles.toe} cx="25.4" cy="17.4" rx="2.2" ry="2.7" />
        </g>
        <path
          className={styles.pad}
          d="M16 16.4c4 0 7.2 3.3 7.2 6.4 0 2.4-1.8 3.9-4.2 3.9-1.2 0-2-.4-3-.4s-1.8.4-3 .4c-2.4 0-4.2-1.5-4.2-3.9 0-3.1 3.2-6.4 7.2-6.4Z"
        />
      </g>
    </svg>
  );
}
