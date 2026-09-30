"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "../../lib/cn";
import { settingsSections } from "./settingsSections";
import styles from "./SettingsLayout.module.css";

/** Settings shell — lives outside the main workspace, reached from Profile (spec §91). */
export function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={styles.layout}>
      <div className={styles.body}>
        <nav className={styles.nav} aria-label="Settings sections">
          {settingsSections.map((section) => {
            // NavLink resolved these relative to /settings and matched exactly.
            const href = `/settings/${section.id}`;
            const active = pathname === href;
            return (
              <Link
                key={section.id}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(styles.navItem, active && styles.navItemActive)}
              >
                {section.label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
