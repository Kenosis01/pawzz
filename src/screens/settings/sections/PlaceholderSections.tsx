"use client";

import {
  BlocksIcon,
  BotIcon,
  DatabaseIcon,
  SparklesIcon,
} from "../../../components/icons/Icons";
import styles from "../SettingsPage.module.css";

/**
 * The four sections that describe a capability the PRD has specified but that has
 * no runtime behind it yet.
 *
 * Each says what the section is for and that nothing is configured, rather than
 * rendering an empty panel. A blank settings page reads as a bug; a described
 * one reads as a roadmap. Nothing here is faked — no placeholder rows, no
 * invented numbers, no "coming soon" buttons that do nothing when pressed.
 */

export function PlaceholderSection({
  title,
  sub,
  icon,
  body,
}: {
  title: string;
  sub: string;
  icon: React.ReactNode;
  body: string;
}) {
  return (
    <div className={styles.page}>
      <section>
        <h2 className={styles.heading}>{title}</h2>
        <p className={styles.sub}>{sub}</p>
        <p className={styles.note}>{body}</p>

        <div className={styles.empty}>
          <span className={styles.emptyIcon}>{icon}</span>
          <span className={styles.emptyTitle}>Nothing configured yet</span>
          <span className={styles.emptyBody}>
            This section will list what you have set up. It is empty because
            there is nothing to list, not because something failed to load.
          </span>
        </div>
      </section>
    </div>
  );
}

export function ConnectionsSection() {
  return (
    <PlaceholderSection
      title="Connections"
      sub="Connectors and MCP servers Pawzz can reach on your behalf."
      icon={<BlocksIcon size={18} />}
      body={
        "Connectors let a conversation read and write outside sources — a drive, a repository, " +
        "a database. MCP is the same idea over a standard protocol, so one integration can serve " +
        "both. The add menu in the prompt box already carries placeholder rows for both; they " +
        "are inert until a server can be registered and a permission granted."
      }
    />
  );
}

export function AgentsSection() {
  return (
    <PlaceholderSection
      title="Agents"
      sub="Agents Pawzz can run for you, and what each one is allowed to do."
      icon={<BotIcon size={18} />}
      body={
        "An agent is a standing set of instructions, tools and permissions that runs without " +
        "you steering every turn. Each one gets its own permission list — read-only, " +
        "ask-before-acting, or unattended — and the states it can be in are visible at all " +
        "times rather than inferred from whether it is answering. The Co-work routes in the " +
        "sidebar are the surface for this."
      }
    />
  );
}

export function UsageSection() {
  return (
    <div className={styles.page}>
      <section>
        <h2 className={styles.heading}>Usage</h2>
        <p className={styles.sub}>Where your time and tokens have gone.</p>
        <p className={styles.note}>
          This page is built around four cards — today, the last five hours,
          this month, and what your plan allows. The figures behind them come
          from a connected model runtime, and there is not one yet, so there is
          nothing to chart. Showing zeroes would imply the number is real, so
          the cards wait.
        </p>

        <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <DatabaseIcon size={18} />
          </span>
          <span className={styles.emptyTitle}>No usage to show yet</span>
          <span className={styles.emptyBody}>
            Once Pawzz is running against a model, this is where the cost and
            the pace live — read as something useful rather than as a warning,
            since the plan is generous by design.
          </span>
        </div>
      </section>

      <section>
        <h2 className={styles.heading}>What counts</h2>
        <div className={styles.shortcuts}>
          <Row label="Per model" value="Which model ran which turn" />
          <Row label="Per agent" value="Time attributed to each agent" />
          <Row label="Per tool" value="Calls made on your behalf" />
        </div>
      </section>
    </div>
  );
}

export function SubscriptionSection() {
  return (
    <PlaceholderSection
      title="Subscription"
      sub="Your plan, and what changes with it."
      icon={<SparklesIcon size={18} />}
      body={
        "A plan affects model access, agent limits and how much runs unattended. None of that " +
        "is active, so there is no plan to show and nothing to change. Every capability Pawzz " +
        "has today runs without one."
      }
    />
  );
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
