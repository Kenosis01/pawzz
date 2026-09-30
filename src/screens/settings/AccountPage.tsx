"use client";

import styles from "./AccountPage.module.css";

/**
 * General.
 *
 * Deliberately blank. The section is still in the registry so the nav keeps its
 * shape, but there is nothing to configure here: the name it used to hold is
 * read from storage and used for the greeting, and offering a field for it in a
 * settings page implies it is a preference rather than a greeting.
 *
 * Kept as a surface rather than deleted so the section id keeps resolving —
 * removing the component would turn `/settings/general` into a 404 and break any
 * link or bookmark that already points at it.
 */
export function AccountPage() {
  return <div className={styles.page} />;
}
