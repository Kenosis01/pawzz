"use client";

import Link from "next/link";

import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>This page does not exist.</h1>
      <Link href="/chat" className={styles.link}>
        Back to Chat
      </Link>
    </main>
  );
}
