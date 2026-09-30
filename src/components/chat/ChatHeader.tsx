"use client";

import { cn } from "../../lib/cn";
import { useIncognito } from "../../lib/incognito";
import { GhostIcon } from "../icons/Icons";
import styles from "./ChatHeader.module.css";

/**
 * Chat panel header. Deliberately almost empty (PRD §17): the incognito control
 * sits top-right and nothing competes with it.
 *
 * The toggle only records the intent for now — the hidden-chat behaviour
 * itself is not wired up yet.
 */
export function ChatHeader() {
  const { on: incognito, toggle } = useIncognito();

  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.action}
        onClick={toggle}
        aria-pressed={incognito}
        aria-label={incognito ? "Turn off incognito chat" : "Start an incognito chat"}
        title={incognito ? "Incognito chat is on" : "Start an incognito chat"}
        data-icon-trigger
      >
        {/* The ring lives on an inner span that hugs the glyph, so the outline
            traces the ghost instead of boxing it. */}
        <span className={cn(styles.glyph, incognito && styles.glyphActive)}>
          <GhostIcon size={16} />
        </span>
      </button>
    </header>
  );
}
