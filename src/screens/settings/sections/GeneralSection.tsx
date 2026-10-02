"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { MonitorIcon, MoonIcon, SunIcon } from "../../../components/icons/Icons";
import { Select } from "../../../components/ui/Select";
import { useTheme } from "../../../lib/theme";
import styles from "../SettingsPage.module.css";

function useStored(key: string, initial: string): [string, (v: string) => void] {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setValue(stored);
    } catch {
      // Storage unavailable — keep default.
    }
  }, [key]);
  const set = (next: string) => {
    setValue(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      // Ignore.
    }
  };
  return [value, set];
}


const CHAT_FONTS = [
  { value: "geist-sans", label: "Geist Sans", stack: "var(--font-sans)" },
  { value: "source-serif", label: "Source Serif 4", stack: "var(--font-response)" },
  { value: "cormorant", label: "Cormorant Garamond", stack: "var(--font-editorial)" },
  { value: "geist-mono", label: "Geist Mono", stack: "var(--font-mono)" },
];



export function GeneralSection() {
  const { theme, setTheme } = useTheme();
  const [chatFont, setChatFont] = useStored("pawzz.chat-font", "geist-sans");
  const [width, setWidth] = useStored("pawzz.transcript-width", "narrow");
  const [motion, setMotion] = useStored("pawzz.motion", "system");

  useEffect(() => {
    try {
      const entry = CHAT_FONTS.find((f) => f.value === chatFont);
      if (entry) {
        document.documentElement.style.setProperty("--pawzz-chat-font", entry.stack);
      }
      const widths: Record<string, string> = {
        narrow: "640px",
        medium: "780px",
        wide: "960px",
      };
      document.documentElement.style.setProperty(
        "--reading-width",
        widths[width] ?? "640px",
      );
      /* Reduced motion is two things, and only doing the first is how this
         control would have looked done and not been. Each component's own
         `prefers-reduced-motion` block still covers the OS setting; this class
         is the manual override, and it has to sit on an ancestor of the whole
         app or it reaches nothing. */
      document.documentElement.classList.toggle("reduce-motion", motion === "reduced");
    } catch {
      // Ignore.
    }
  }, [chatFont, width, motion]);

  const themeIndex = Math.max(0, THEME_ORDER.indexOf(theme));

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Appearance</h2>

      <Row label="Theme">
        <div
          className={styles.segmented}
          style={
            { "--seg-count": THEME_ORDER.length, "--seg-index": themeIndex } as CSSProperties
          }
          role="radiogroup"
          aria-label="Theme"
        >
          <span className={styles.segmentPill} aria-hidden="true" />
          <ThemeOption
            value="system"
            current={theme}
            onSelect={setTheme}
            icon={<MonitorIcon size={15} />}
            label="System"
          />
          <ThemeOption
            value="light"
            current={theme}
            onSelect={setTheme}
            icon={<SunIcon size={15} />}
            label="Light"
          />
          <ThemeOption
            value="dark"
            current={theme}
            onSelect={setTheme}
            icon={<MoonIcon size={15} />}
            label="Dark"
          />
        </div>
      </Row>

      <Row label="Chat font">
        <Select
          className={styles.select}
          value={chatFont}
          onChange={setChatFont}
          ariaLabel="Chat font"
          options={CHAT_FONTS.map((f) => ({ value: f.value, label: f.label }))}
        />
      </Row>

      <Row label="Transcript width" hint="Max width of transcript and composer.">
        <Segment
          options={["Narrow", "Medium", "Wide"]}
          value={width}
          onChange={setWidth}
        />
      </Row>

      <Row
        label="Motion"
        hint="Reduce animation in streaming responses and interface."
      >
        <Segment options={["System", "Reduced"]} value={motion} onChange={setMotion} />
      </Row>
    </div>
  );
}

/**
 * The order the three options are declared in. The sliding pill is positioned
 * by index, so this array and the JSX below have to stay in the same sequence —
 * the order is what tells the pill where to travel.
 */
const THEME_ORDER = ["system", "light", "dark"] as const;

function ThemeOption({
  value,
  current,
  onSelect,
  icon,
  label,
}: {
  value: "system" | "light" | "dark";
  current: "light" | "dark" | "system";
  onSelect: (v: "system" | "light" | "dark") => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={current === value}
      className={`${styles.segment} ${styles.themeBtn}`}
      onClick={() => onSelect(value)}
    >
      {icon}
      <span className={styles.themeBtnLabel}>{label}</span>
    </button>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.rowText}>
        <span className={styles.rowLabel}>{label}</span>
        {hint ? <span className={styles.rowHint}>{hint}</span> : null}
      </span>
      <span className={styles.rowControl}>{children}</span>
    </div>
  );
}

function Segment({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.toLowerCase() === value),
  );

  return (
    <div
      className={styles.segmented}
      style={
        {
          "--seg-count": options.length,
          "--seg-index": index,
        } as CSSProperties
      }
      role="radiogroup"
    >
      <span className={styles.segmentPill} aria-hidden="true" />
      {options.map((opt) => {
        const v = opt.toLowerCase();
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={value === v}
            className={styles.segment}
            onClick={() => onChange(v)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
