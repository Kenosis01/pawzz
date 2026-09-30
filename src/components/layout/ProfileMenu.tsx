"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "../../lib/cn";
import { useTheme } from "../../lib/theme";
import { ChevronUpIcon, MoonIcon, SettingsIcon, SunIcon, UserIcon } from "../icons/Icons";
import styles from "./ProfileMenu.module.css";

/**
 * The only sidebar footer control. Appearance and Settings live inside this
 * menu so the bottom of the rail stays quiet; it opens upward because there is
 * no room below it.
 */
export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { isDark, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.container} ref={container}>
      {open ? (
        <div className={styles.menu} role="menu">
          <button type="button" className={styles.item} data-icon-trigger role="menuitem">
            <UserIcon size={15} />
            Profile
          </button>

          <button
            type="button"
            className={styles.item}
            data-icon-trigger
            role="menuitemradio"
            aria-checked={!isDark}
            onClick={toggleTheme}
          >
            {isDark ? <MoonIcon size={15} /> : <SunIcon size={15} />}
            <span className={styles.label}>Appearance</span>
            <span className={styles.value}>{isDark ? "Dark" : "Light"}</span>
          </button>

          <div className={styles.divider} />

          <button
            type="button"
            className={styles.item}
            data-icon-trigger
            role="menuitem"
            onClick={() => {
              setOpen(false);
              router.push("/settings");
            }}
          >
            <SettingsIcon size={15} />
            Settings
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className={cn(styles.trigger, open && styles.triggerOpen)}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        data-icon-trigger
      >
        <UserIcon size={15} />
        <span className={styles.label}>Profile</span>
        <ChevronUpIcon size={14} className={styles.chevron} />
      </button>
    </div>
  );
}
