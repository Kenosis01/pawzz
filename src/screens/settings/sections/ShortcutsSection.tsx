"use client";

import styles from "../SettingsPage.module.css";

/**
 * Keyboard shortcuts.
 *
 * Every row is a shortcut that exists in the build. There are not many yet, and
 * the honest thing is to list three rather than to invent fifteen that do not
 * work. A shortcuts page you cannot trust is worse than no page.
 *
 * No platform detection here: none of the current bindings use a modifier, so
 * there is no Command-versus-Control distinction to make. It comes back the day
 * a real global shortcut exists.
 */
export function ShortcutsSection() {
  return (
    <div className={styles.page}>
      <section>
        <h2 className={styles.heading}>Keyboard shortcuts</h2>
        <p className={styles.sub}>Everything Pawzz responds to today.</p>

        <div className={styles.shortcuts}>
          <Shortcut
            name="Send message"
            keys={["Enter"]}
            note="In the prompt box"
          />
          <Shortcut
            name="New line"
            keys={["Shift", "Enter"]}
            note="In the prompt box"
          />
          <Shortcut
            name="Close a menu"
            keys={["Esc"]}
            note="Model catalogue, add menu, sidebar"
          />
        </div>

        <p className={styles.note}>
          There is no global shortcut yet, not even new chat. That is a gap
          rather than a decision: the surface exists and the bindings do not.
          Search, project switching and a command palette all want the same
          reserved keys, so they should land together rather than one at a time.
        </p>
      </section>
    </div>
  );
}

function Shortcut({
  name,
  keys,
  note,
}: {
  name: string;
  keys: string[];
  note?: string;
}) {
  return (
    <div className={styles.shortcutRow}>
      <span className={styles.rowText}>
        <span className={styles.shortcutName}>{name}</span>
        {note ? <span className={styles.rowHint}>{note}</span> : null}
      </span>
      <span className={styles.shortcutKeys}>
        {keys.map((key) => (
          <kbd key={key}>{key}</kbd>
        ))}
      </span>
    </div>
  );
}
