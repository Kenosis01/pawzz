"use client";

import { PawzzMark } from "../../../components/brand/PawzzMark";
import { useModelCatalogue } from "../../../lib/model-catalogue-context";
import styles from "../SettingsPage.module.css";

/**
 * About. The name says Pawzz and the numbers are read from the build rather than
 * typed in, so they cannot drift out of date the way a hand-written version
 * string does.
 */
export function AboutSection() {
  // Read from the live catalogue, so the number is a fact rather than a claim.
  const { models, loading } = useModelCatalogue();

  return (
    <div className={styles.page}>
      <section>
        <div className={styles.about}>
          <PawzzMark size={44} />
          <div>
            <h2 className={styles.heading}>Pawzz</h2>
            <p className={styles.sub}>A quiet place to think out loud.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className={styles.heading}>Version</h2>
        <div className={styles.shortcuts}>
          <Row label="Release" value={VERSION} />
          <Row label="Framework" value="Next.js 15 · React 19" />
          <Row label="Runtime" value="TypeScript, no client data library" />
          <Row label="Models available" value={loading ? "Loading…" : String(models.length)} />
        </div>
        <p className={styles.note}>
          This is the web build. The desktop app is the same interface in a
          Tauri window, and the two share a design system rather than a
          codebase.
        </p>
      </section>

      <section>
        <h2 className={styles.heading}>Status</h2>
        <p className={styles.note}>
          Chat, projects, agents, design workspaces and co-work are specified
          and navigable. The model runtime is not connected, so nothing has been
          sent to a model yet — the interface is complete and the plumbing
          behind it is the next piece of work.
        </p>
      </section>
    </div>
  );
}

const VERSION = "0.1.0";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.shortcutRow}>
      <span className={styles.shortcutName}>{label}</span>
      <span className={styles.shortcutKeys}>
        <kbd className={styles.key}>{value}</kbd>
      </span>
    </div>
  );
}
