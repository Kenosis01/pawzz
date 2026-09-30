"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "../../lib/cn";
import { projectSections } from "./projectSections";
import styles from "./ProjectLayout.module.css";

/** Project workspace shell — persistent context across every section (spec §49). */
export function ProjectLayout({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className={styles.layout}>
      <div className={styles.body}>
        <nav className={styles.nav} aria-label="Project sections">
          {projectSections.map((section) => {
            const href = section.path
              ? `/projects/${projectId}/${section.path}`
              : `/projects/${projectId}`;

            // `end={!section.path}` on the NavLink meant: the index section
            // matches only itself, the rest match on a path-boundary prefix.
            const active = section.path
              ? pathname === href || pathname.startsWith(`${href}/`)
              : pathname === href;

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
