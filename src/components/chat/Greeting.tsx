"use client";

import { useEffect, useState } from "react";

import { greetFor } from "../../lib/greeting";
import { useIncognito } from "../../lib/incognito";
import { PawzzMark } from "../brand/PawzzMark";
import styles from "./Greeting.module.css";

/**
 * Empty-chat greeting (PRD §10). Shown above the prompt box, and only on the
 * empty state — the mark and the line disappear once a conversation starts.
 *
 * Incognito replaces the greeting outright rather than qualifying it. "Good
 * evening" next to a ghost toggle that is already lit says nothing about the
 * thing the user just turned on, and the empty state is the only place to say
 * it in full.
 */
export function Greeting() {
  // Resolved after mount so the first paint is not locked to a stale name.
  const [line, setLine] = useState("");
  const { on: incognito } = useIncognito();

  useEffect(() => {
    if (incognito) return;
    setLine(greetFor());
  }, [incognito]);

  return (
    <div className={styles.greeting}>
      <PawzzMark size={52} className={styles.mark} />
      <h1 className={styles.line}>{incognito ? "You’re incognito" : line}</h1>
    </div>
  );
}
