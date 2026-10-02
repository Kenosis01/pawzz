"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { XIcon } from "../../components/icons/Icons";
import { cn } from "../../lib/cn";
import { settingsSections } from "./settingsSections";
import styles from "./SettingsLayout.module.css";

/** Settings dialog — a centered card with sidebar + content, Claude-style. */
export function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");

  // Memory is a writing page, not a scrolling panel: its editor is the page and
  // scrolls itself at `height: 100%`. If this column scrolled as well the two
  // would nest, and the outer scroller would move a fixed-height child that
  // never moves — so the page would look frozen. Read off the route rather than
  // passed down, so the layout does not need to know anything about the
  // sections themselves.
  const fullBleed = pathname.startsWith("/settings/memory");

  const sections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [...settingsSections];
    return settingsSections.filter((s) =>
      s.label.toLowerCase().includes(needle),
    );
  }, [query]);

  return (
    <div className={styles.backdrop}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <aside className={styles.sidebar}>
          <div className={styles.search}>
            <svg
              viewBox="0 0 24 24"
              width={15}
              height={15}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search settings"
              className={styles.searchInput}
            />
          </div>
          <p className={styles.groupLabel}>Settings</p>
          <nav aria-label="Settings sections" className={styles.nav}>
            {sections.map((section) => {
              const href = `/settings/${section.id}`;
              const active =
                pathname === href ||
                (section.id === "general" && pathname === "/settings");
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
            {sections.length === 0 ? (
              <p className={styles.noMatch}>No matches</p>
            ) : null}
          </nav>
        </aside>
        <div className={styles.main}>
          <button
            type="button"
            className={styles.close}
            onClick={() => router.push("/chat")}
            aria-label="Close settings"
          >
            <XIcon size={16} />
          </button>
          <div className={cn(fullBleed && styles.contentBleed, styles.content)}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
