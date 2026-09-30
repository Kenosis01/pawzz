"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "../../lib/cn";
import {
  ChevronRightIcon,
  FolderOpenIcon,
  PencilIcon,
  PinIcon,
  ShareIcon,
  TrashIcon,
} from "../icons/Icons";
import styles from "./Sidebar.module.css";

export type HistoryEntry = {
  id: string;
  title: string;
  pinned: boolean;
};

/**
 * The menu behind a chat's three dots.
 *
 * Positioned against its row rather than the viewport: the sidebar scrolls and
 * resizes, and a floating layer anchored to a screen coordinate drifts the
 * moment either happens. `getBoundingClientRect` on mount decides which way it
 * opens — down normally, up for a row near the bottom — because the history list
 * clips its own overflow and a menu drawn off the end of it is a menu nobody can
 * reach.
 *
 * Dismissal is outside-click and Escape, matched by an attribute shared with the
 * button that opened it instead of a DOM ref: the button is a sibling of this
 * node, so a plain "is the click inside the menu" test would close the menu the
 * second time you press the button that is meant to toggle it.
 */
export function ChatRowMenu({
  entry,
  onClose,
  onRename,
  onPin,
  onDelete,
}: {
  entry: HistoryEntry;
  onClose: () => void;
  onRename: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const [projectOpen, setProjectOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [up, setUp] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - 8) setUp(true);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(`[data-chat-menu="${entry.id}"]`)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [entry.id, onClose]);

  const share = async () => {
    const url = `${window.location.origin}/chat/${entry.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard access is denied in some contexts. The link is in the address
      // bar and the menu simply closes rather than claiming a copy that did not
      // happen.
      onClose();
      return;
    }
    setCopied(true);
    window.setTimeout(() => {
      setCopied(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      ref={ref}
      className={cn(styles.menu, up && styles.menuUp)}
      role="menu"
      aria-label={`Options for ${entry.title}`}
      data-chat-menu={entry.id}
    >
      <button
        type="button"
        role="menuitem"
        className={styles.menuItem}
        onClick={onPin}
      >
        <PinIcon size={14} className={styles.menuIcon} />
        <span className={styles.menuLabel}>
          {entry.pinned ? "Unpin" : "Pin"}
        </span>
      </button>

      <button
        type="button"
        role="menuitem"
        className={styles.menuItem}
        onClick={onRename}
      >
        <PencilIcon size={14} className={styles.menuIcon} />
        <span className={styles.menuLabel}>Rename</span>
      </button>

      <div className={styles.menuGroup}>
        <button
          type="button"
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={projectOpen}
          className={styles.menuItem}
          onClick={() => setProjectOpen((open) => !open)}
        >
          <FolderOpenIcon size={14} className={styles.menuIcon} />
          <span className={styles.menuLabel}>Add project</span>
          <ChevronRightIcon
            size={13}
            className={cn(styles.menuChevron, projectOpen && styles.menuChevronOpen)}
          />
        </button>
        {projectOpen ? (
          <div className={styles.submenu} role="menu">
            <span className={styles.submenuEmpty}>No projects yet</span>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        role="menuitem"
        className={styles.menuItem}
        onClick={() => void share()}
      >
        <ShareIcon size={14} className={styles.menuIcon} />
        <span className={styles.menuLabel}>
          {copied ? "Link copied" : "Share Chat"}
        </span>
      </button>

      <div className={styles.menuSeparator} role="separator" />

      <button
        type="button"
        role="menuitem"
        className={cn(styles.menuItem, styles.menuItemDanger)}
        onClick={onDelete}
      >
        <TrashIcon size={14} className={styles.menuIcon} />
        <span className={styles.menuLabel}>Delete</span>
      </button>
    </div>
  );
}
