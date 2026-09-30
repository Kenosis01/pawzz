"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { setName } from "../../lib/greeting";
import styles from "./onboarding.module.css";

/** One question: what should we call you? */
export function WelcomePage() {
  const router = useRouter();
  const [name, setValue] = useState("");

  const advance = () => {
    setName(name);
    router.push("/onboarding/intent");
  };

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>What should we call you?</h1>
      <p className={styles.subtitle}>This personalizes the greeting.</p>
      <input
        className={styles.input}
        autoFocus
        aria-label="Your name"
        placeholder="Your name"
        value={name}
        onChange={(event) => setValue(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") advance();
        }}
      />
      <button type="button" className={styles.primary} onClick={advance}>
        Continue
      </button>
      <button type="button" className={styles.ghost} onClick={advance}>
        Skip
      </button>
    </main>
  );
}
