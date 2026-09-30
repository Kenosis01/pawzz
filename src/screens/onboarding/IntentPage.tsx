"use client";

import { useRouter } from "next/navigation";

import styles from "./onboarding.module.css";

const intents = ["Study", "Coding", "Work", "Research", "Writing", "Design", "Everything"];

/** Two questions total, then the app is usable (spec §131). */
export function IntentPage() {
  const router = useRouter();

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>What do you usually use AI for?</h1>
      <p className={styles.subtitle}>This tailors your first experience.</p>
      <div className={styles.options}>
        {intents.map((intent) => (
          <button key={intent} type="button" className={styles.option}>
            {intent}
          </button>
        ))}
      </div>
      <button type="button" className={styles.primary} onClick={() => router.push("/chat")}>
        Start using Pawzz
      </button>
    </main>
  );
}
