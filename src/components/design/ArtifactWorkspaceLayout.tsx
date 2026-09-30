"use client";

import type { ReactNode } from "react";

import styles from "./ArtifactWorkspaceLayout.module.css";

/**
 * Three-region artifact editor: navigation | canvas | inspector (spec §78).
 * Presentation, website and document pages all compose this and differ only in
 * what they put in each slot.
 */
export function ArtifactWorkspaceLayout({
  navigation,
  canvas,
  inspector,
  toolbar,
}: {
  navigation?: ReactNode;
  canvas?: ReactNode;
  inspector?: ReactNode;
  toolbar?: ReactNode;
}) {
  return (
    <div className={styles.workspace}>
      {toolbar ? <div className={styles.toolbar}>{toolbar}</div> : null}
      <div className={styles.regions}>
        <aside className={styles.navigation}>{navigation}</aside>
        <div className={styles.canvas}>{canvas}</div>
        <aside className={styles.inspector}>{inspector}</aside>
      </div>
    </div>
  );
}
