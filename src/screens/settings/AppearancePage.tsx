"use client";

import { useTheme, type Theme } from "../../lib/theme";
import styles from "./AppearancePage.module.css";

const options: { value: Theme; label: string; hint: string }[] = [
  {
    value: "system",
    label: "System",
    hint: "Follow the appearance set in macOS.",
  },
  { value: "light", label: "Light", hint: "Warm white, never pure #FFFFFF." },
  { value: "dark", label: "Dark", hint: "Warm charcoal, never pure black." },
];

export function AppearancePage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className={styles.page}>
      <section>
        <h2 className={styles.heading}>Appearance</h2>
        <p className={styles.sub}>Pawzz follows your system by default.</p>

        <div
          className={styles.options}
          role="radiogroup"
          aria-label="Appearance"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={theme === option.value}
              className={styles.option}
              onClick={() => setTheme(option.value)}
            >
              <span className={styles.optionLabel}>{option.label}</span>
              <span className={styles.optionHint}>{option.hint}</span>
              {theme === option.value ? (
                <span className={styles.check} aria-hidden="true" />
              ) : null}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className={styles.heading}>Typeface</h2>
        <p className={styles.sub}>
          Geist Sans with the platform UI face as fallback, so Pawzz looks
          native wherever it runs.
        </p>
      </section>

      <section>
        <h2 className={styles.heading}>Motion</h2>
        <p className={styles.sub}>
          Pawzz already honours your system Reduce Motion setting. Transitions
          run 120&ndash;450ms and only ever communicate state.
        </p>
      </section>
    </div>
  );
}
