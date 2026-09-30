"use client";

import { useCallback, useEffect, useState } from "react";

import { useConversations } from "../../../state/conversation";
import { getName, setName } from "../../../lib/greeting";
import styles from "../SettingsPage.module.css";

/**
 * Privacy and data controls (PRD §38).
 *
 * Every one of these rows is true today: Pawzz has no account, no server and no
 * analytics, so the honest privacy page is a list of what sits in this browser
 * and a way to delete it. The keys are named explicitly rather than described in
 * the abstract, because "we store your data" tells nobody anything — being able
 * to see it and remove it does.
 */
export function PrivacySection() {
  const { conversations, hydrated } = useConversations();
  const [pending, setPending] = useState<null | "conversations" | "everything">(
    null,
  );

  // Read after mount, like the greeting does. Reading storage during render
  // returns null on the server and the real name on the client, which is a
  // hydration mismatch rather than a flash.
  const [name, setNameState] = useState<string | null>(null);
  useEffect(() => setNameState(getName()), []);

  const threadCount = Object.keys(conversations).length;
  const messageCount = Object.values(conversations).reduce(
    (total, conversation) => total + conversation.messages.length,
    0,
  );

  const clearConversations = useCallback(() => {
    try {
      localStorage.removeItem("pawzz.conversations.v1");
    } catch {
      // Nothing to clear if storage is unavailable.
    }
    setPending(null);
    // The provider holds the transcripts in memory; a reload is what actually
    // drops them, and pretending otherwise would leave the list showing ghosts.
    window.location.reload();
  }, []);

  const clearEverything = useCallback(() => {
    try {
      for (const entry of ALL_KEYS) localStorage.removeItem(entry.key);
    } catch {
      // Same.
    }
    setPending(null);
    window.location.reload();
  }, []);

  return (
    <div className={styles.page}>
      <section>
        <h2 className={styles.heading}>What Pawzz stores</h2>
        <p className={styles.sub}>
          Everything lives in this browser. Nothing is uploaded, and there is no
          account to associate it with.
        </p>

        <div className={styles.group}>
          <Row
            label="Conversations"
            hint={
              hydrated
                ? `${threadCount} thread${threadCount === 1 ? "" : "s"}, ${messageCount} message${messageCount === 1 ? "" : "s"}.`
                : "Reading…"
            }
            control={
              pending === "conversations" ? (
                <Confirm
                  label="Delete all conversations?"
                  onConfirm={clearConversations}
                  onCancel={() => setPending(null)}
                />
              ) : (
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonDanger}`}
                  disabled={!hydrated || threadCount === 0}
                  onClick={() => setPending("conversations")}
                >
                  Clear
                </button>
              )
            }
          />
          <Row
            label="Display name"
            hint={
              name
                ? `“${name}”, used only for the greeting.`
                : "Not set. Pawzz greets you without one."
            }
            control={
              <button
                type="button"
                className={styles.button}
                onClick={() => {
                  setName("");
                  setNameState(null);
                  window.location.reload();
                }}
              >
                {name ? "Remove" : "Nothing to remove"}
              </button>
            }
          />
          <Row
            label="Preferences"
            hint="Theme, sidebar width, whether the sidebar is collapsed, your default model, effort level, thinking toggle and incognito state. Settings, not content."
          />
        </div>
      </section>

      <section>
        <h2 className={styles.heading}>Reset Pawzz</h2>
        <p className={styles.sub}>
          Removes every key listed above and returns the app to a fresh install.
        </p>

        <div className={styles.group}>
          <Row
            label="Clear all Pawzz data"
            hint="Conversations, name, theme, sidebar and model. This cannot be undone."
            control={
              pending === "everything" ? (
                <Confirm
                  label="Erase everything?"
                  onConfirm={clearEverything}
                  onCancel={() => setPending(null)}
                />
              ) : (
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonDanger}`}
                  onClick={() => setPending("everything")}
                >
                  Reset
                </button>
              )
            }
          />
        </div>
      </section>

      <section>
        <h2 className={styles.heading}>Where it is stored</h2>
        <p className={styles.sub}>
          The exact keys, if you would rather look or clear them yourself.
        </p>
        <div className={styles.shortcuts}>
          {ALL_KEYS.map((entry) => (
            <div key={entry.key} className={styles.shortcutRow}>
              <span className={styles.shortcutName}>{entry.what}</span>
              <span className={styles.shortcutKeys}>
                <kbd className={styles.key}>{entry.key}</kbd>
              </span>
            </div>
          ))}
        </div>
        <p className={styles.note}>
          The model list is fetched from OpenRouter when you open Pawzz, and
          which models you have switched off is stored locally. A model is only
          contacted once you send a prompt, and there is no analytics or crash
          reporting in the build.
        </p>
      </section>
    </div>
  );
}

const ALL_KEYS = [
  { key: "pawzz.conversations.v1", what: "Conversation transcripts" },
  { key: "pawzz.name", what: "Display name" },
  { key: "pawzz.theme", what: "Theme preference" },
  { key: "pawzz.sidebar.width", what: "Sidebar width" },
  { key: "pawzz.sidebar.collapsed", what: "Sidebar collapsed" },
  { key: "pawzz.model", what: "Default model" },
  { key: "pawzz.effort", what: "Effort level" },
  { key: "pawzz.thinking", what: "Thinking toggle" },
  { key: "pawzz.incognito", what: "Incognito chat" },
];

function Row({
  label,
  hint,
  control,
}: {
  label: string;
  hint: string;
  control?: React.ReactNode;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.rowText}>
        <span className={styles.rowLabel}>{label}</span>
        <span className={styles.rowHint}>{hint}</span>
      </span>
      {control ? <span className={styles.rowControl}>{control}</span> : null}
    </div>
  );
}

/**
 * Two-step rather than window.confirm: a native modal for a destructive action
 * that the user will rarely trigger is heavier than the action deserves, and the
 * inline version keeps the context visible.
 */
function Confirm({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <span className={styles.rowHint}>{label}</span>
      <button
        type="button"
        className={`${styles.button} ${styles.buttonDanger}`}
        onClick={onConfirm}
      >
        Yes, delete
      </button>
      <button type="button" className={styles.button} onClick={onCancel}>
        Cancel
      </button>
    </>
  );
}
