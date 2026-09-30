"use client";

import { useState, type ReactNode } from "react";

import { cn } from "../../lib/cn";
import styles from "./Workbench.module.css";

export type WorkbenchTab = {
  id: string;
  label: string;
  content: ReactNode;
};

/**
 * Contextual right-side panel. It reserves no width while closed (spec §6) and
 * shows no tab strip when there is nothing to preview (spec §28).
 */
export function Workbench({ tabs }: { tabs: WorkbenchTab[] }) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [width, setWidth] = useState(0);

  // Destructured rather than indexed: `tabs[0]` is `WorkbenchTab | undefined`
  // under noUncheckedIndexedAccess, and the guard is what makes it safe.
  const [first, ...others] = tabs;
  if (!first) return null;

  const active = tabs.find((tab) => tab.id === activeId) ?? first;
  void others;

  return (
    <aside
      className={cn(styles.workbench, open && styles.workbenchOpen)}
      style={width ? { width } : undefined}
      aria-label="Workbench"
      aria-hidden={!open}
    >
      <header className={styles.header}>
        <div className={styles.tabs} role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === active.id}
              className={cn(styles.tab, tab.id === active.id && styles.tabActive)}
              onClick={() => setActiveId(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button type="button" className={styles.close} onClick={() => setOpen(false)}>
          Close
        </button>
      </header>

      {open ? (
        <>
          <div
            className={styles.resizer}
            role="separator"
            aria-orientation="vertical"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              const next = window.innerWidth - event.clientX;
              setWidth(Math.min(Math.max(next, 320), window.innerWidth * 0.6));
            }}
            onPointerUp={(event) => {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
          />
          <div className={styles.body} role="tabpanel">
            {active.content}
          </div>
        </>
      ) : null}

      <button type="button" className={styles.handle} onClick={() => setOpen((value) => !value)}>
        {open ? "Hide workbench" : "Open workbench"}
      </button>
    </aside>
  );
}
