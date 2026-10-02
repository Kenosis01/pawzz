"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";

import { cn } from "../../lib/cn";
import styles from "./ModeSwitch.module.css";

const modes = [
  { to: "/chat", label: "Chat" },
  { to: "/cowork", label: "Work" },
] as const;

/**
 * The workspace the URL points at, or null for a route that is none of them
 * (settings, projects, search).
 */
function matchMode(pathname: string) {
  return (
    modes.find(({ to }) => pathname === to || pathname.startsWith(`${to}/`)) ??
    null
  );
}

/**
 * The rail under the brand: one pill that slides between the workspaces.
 * It navigates — these are links, not tabs, because there is no panel beside
 * them to switch; `aria-current` is the honest signal.
 *
 * The pill follows the URL, not the click: a middle-click or a back navigation
 * has to land in the state the pill shows. The click also sets it, so the pill
 * starts moving before the route resolves. A route outside the list keeps the
 * last workspace rather than blanking the control.
 *
 * `--mode-count` is written alongside the index because the CSS needs both and
 * hardcoding the number in two stylesheet rules is how removing a mode leaves a
 * half-width pill behind.
 */
export function ModeSwitch({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const [active, setActive] = useState(
    () => matchMode(pathname)?.to ?? modes[0].to,
  );

  useEffect(() => {
    const hit = matchMode(pathname);
    if (hit) setActive(hit.to);
  }, [pathname]);

  const index = Math.max(
    0,
    modes.findIndex(({ to }) => to === active),
  );

  return (
    <div
      className={styles.track}
      style={
        {
          "--mode-index": index,
          "--mode-count": modes.length,
        } as CSSProperties
      }
    >
      <span className={styles.pill} aria-hidden="true" />

      {modes.map(({ to, label }) => {
        const selected = active === to;
        return (
          <Link
            key={to}
            href={to}
            className={cn(styles.segment, selected && styles.segmentActive)}
            aria-current={selected ? "page" : undefined}
            tabIndex={collapsed ? -1 : undefined}
            onClick={() => setActive(to)}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
