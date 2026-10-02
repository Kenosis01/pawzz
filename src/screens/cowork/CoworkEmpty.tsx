"use client";

import { Greeting } from "../../components/chat/Greeting";
import { Composer } from "../../components/chat/Composer";
import { BlocksIcon, BrainIcon, GlobeIcon, SparklesIcon } from "../../components/icons/Icons";
import styles from "./CoworkEmpty.module.css";

/**
 * Empty work state. The same composer as chat, but the composition is not
 * centred: a workspace has a starting corner, so the greeting sits at the left
 * edge of the prompt box with the mark beside it, and the suggestions run
 * beneath the box as plain text separated by hairlines — not pills, because a
 * pill is a button and a suggestion that looks like a button promises a click
 * that fills in the prompt instead.
 */
export function CoworkEmpty() {
  return (
    <div className={styles.stage}>
      <Greeting left />
      <Composer />
      <ul className={styles.suggestions}>
        <Suggestion icon={<SparklesIcon size={15} />}>
          Draft a launch post for the new release
        </Suggestion>
        <Suggestion icon={<BlocksIcon size={15} />}>
          Break this project into weekly milestones
        </Suggestion>
        <Suggestion icon={<BrainIcon size={15} />}>
          Summarise what we decided last session
        </Suggestion>
        <Suggestion icon={<GlobeIcon size={15} />}>
          Research competitors in the same space
        </Suggestion>
      </ul>
    </div>
  );
}

function Suggestion({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className={styles.suggestion}>
      <span className={styles.suggestionIcon}>{icon}</span>
      <span className={styles.suggestionText}>{children}</span>
    </li>
  );
}
