"use client";

import {
  ArchiveIcon,
  BlocksIcon,
  CheckIcon,
  ChevronRightIcon,
  DatabaseIcon,
  GlobeIcon,
  PaletteIcon,
  PaperclipIcon,
  PlusIcon,
  PuzzleIcon,
  ScrollIcon,
} from "../../icons/Icons";
import { cn } from "../../../lib/cn";
import styles from "../Composer.module.css";

/**
 * The `[+]` menu beside the field.
 *
 * Mostly a list of things that are not built yet, which is why it lives in its
 * own file: it is a menu of intentions, not behaviour, and it changes on its own
 * schedule rather than with the box. The two entries that do work — attaching
 * files, and the two toggles that are on by default — are the only ones wired to
 * anything.
 */
export function PlusMenu({
  open,
  onToggle,
  filesInputId,
  anchorRef,
}: {
  open: boolean;
  onToggle: () => void;
  filesInputId: string;
  /**
   * The outside-click handler in Composer.tsx tests against this element, so it
   * has to be the positioned `.anchor` the menu hangs off — not a wrapper around
   * it, which would leave the menu outside what that test considers "inside".
   */
  anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className={styles.anchor} ref={anchorRef}>
      <button
        type="button"
        className={cn(styles.square, open && styles.squareOpen)}
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Add files, connectors, and more"
        data-icon-trigger
      >
        <PlusIcon size={20} />
      </button>

      {open ? (
        <div className={styles.plusMenu} aria-label="Add to prompt">
          <label className={styles.plusItem} htmlFor={filesInputId}>
            <PaperclipIcon size={15} />
            <span className={styles.plusLabel}>Add files or photos</span>
            <kbd className={styles.plusHint}>Ctrl+U</kbd>
          </label>
          <span className={styles.plusDivider} aria-hidden="true" />
          <StubItem icon={<ArchiveIcon size={15} />} label="Add to project" />
          <StubItem icon={<ScrollIcon size={15} />} label="Skills" />
          <StubItem icon={<BlocksIcon size={15} />} label="Connectors" />
          <StubItem icon={<PaletteIcon size={15} />} label="Design system" />
          <StubItem icon={<PuzzleIcon size={15} />} label="Add plugins" />
          <span className={styles.plusDivider} aria-hidden="true" />
          {/* Web search is on by default and needs no configuring
              (PRD §13) — the user only toggles it off. */}
          <AlwaysOn label="Web search" icon={<GlobeIcon size={15} />} />
          <AlwaysOn label="Memory" icon={<DatabaseIcon size={15} />} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * An entry for something that does not exist yet.
 *
 * Disabled rather than absent, so the shape of the menu is legible before it is
 * finished — and removed from the tab order entirely, because a focusable
 * control that does nothing is a trap for anyone navigating by keyboard.
 */
function StubItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button type="button" className={styles.plusItem} disabled>
      {icon}
      <span className={styles.plusLabel}>{label}</span>
      <ChevronRightIcon size={14} className={styles.plusChevron} />
    </button>
  );
}

/**
 * A capability that is on unless switched off.
 *
 * The checkbox is real and checked, and the tick beside it is a picture of that
 * state rather than the control itself — so the keyboard and the screen reader
 * get native behaviour and the row still looks like a settings row.
 */
function AlwaysOn({
  label,
  icon,
}: {
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <label className={styles.plusItem}>
      {icon}
      <span className={styles.plusLabel}>{label}</span>
      <input type="checkbox" className={styles.srOnly} defaultChecked />
      <CheckIcon size={15} className={styles.plusCheck} />
    </label>
  );
}
