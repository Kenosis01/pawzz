"use client";

import Link from "next/link";
import { useState } from "react";

import { BotMark, type BotFace } from "../../../components/brand/BotMark";
import { cn } from "../../../lib/cn";
import styles from "../SettingsPage.module.css";

/**
 * The four bots.
 *
 * An agent used to be initials on a tinted circle, and the tint was the whole
 * of the identity: four identical dots in four colours, which reads as a
 * swatch rather than as somebody. Each entry pairs a face with a tint from the
 * existing status palette — an avatar must not invent colour that means
 * something else somewhere in the app — so the row is a choice of who the
 * agent is, and the colour comes along with it rather than being the choice.
 *
 * The tint ids are unchanged and still travel to Co-work as `?tint=`, so this
 * is a change of face, not of contract.
 */
const AVATARS = {
  accent: "antenna",
  success: "visor",
  info: "pods",
  warning: "crest",
} as const satisfies Record<string, BotFace>;

type AvatarTint = keyof typeof AVATARS;

const TINTS = Object.keys(AVATARS) as AvatarTint[];

export function UsageSection() {
  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>Usage</h2>
      <p className={styles.sub}>Where your time and tokens have gone.</p>
      <p className={styles.empty}>
        No usage to show yet. Figures appear once a model runtime is connected.
      </p>
      <div className={styles.shortcuts}>
        <Row label="Per model" value="Turns by model" />
        <Row label="Per agent" value="Time by agent" />
        <Row label="Per tool" value="Calls made" />
      </div>
    </div>
  );
}

export function SubscriptionSection() {
  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>Subscription</h2>
      <p className={styles.sub}>Your plan, and what changes with it.</p>
      <p className={styles.empty}>
        No plan yet. Everything available today runs without one.
      </p>
    </div>
  );
}

export function AgentsSection() {
  const [name, setName] = useState("");
  const [tint, setTint] = useState<AvatarTint>("accent");
  const [about, setAbout] = useState("");

  const face = AVATARS[tint];

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>Agents</h2>
      <p className={styles.sub}>
        Create an agent that works for you in Co-work.
      </p>

      <div className={styles.agentPreview}>
        <span className={styles.agentMark} data-tint={tint} aria-hidden="true">
          <BotMark face={face} size={30} />
        </span>
        <span className={styles.agentPreviewName}>
          {name.trim() || "Your agent"}
        </span>
      </div>

      <div className={styles.defaultRow}>
        <input
          type="text"
          className={styles.textInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Agent name, e.g. Research Buddy"
          aria-label="Agent name"
          maxLength={40}
        />
        <textarea
          className={styles.textInput}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="What should this agent do? One or two lines."
          rows={3}
          aria-label="Agent description"
        />
        <div
          className={styles.tintRow}
          role="radiogroup"
          aria-label="Agent bot"
        >
          {TINTS.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tint === t}
              aria-label={`${AVATARS[t]} bot`}
              className={styles.tint}
              data-tint={t}
              onClick={() => setTint(t)}
            >
              <BotMark face={AVATARS[t]} size={20} />
            </button>
          ))}
        </div>
        <Link
          href={
            name.trim()
              ? `/cowork/agents/new?name=${encodeURIComponent(name.trim())}&tint=${tint}`
              : "/cowork/agents/new"
          }
          className={cn(styles.button, styles.buttonSmall)}
        >
          Create your Agent
        </Link>
      </div>
      <p className={styles.note}>
        Opens in Co-work where permissions and runs live.
      </p>
    </div>
  );
}

// Keep old names working for any stray import.
export function ConnectionsSection() {
  return null;
}

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
