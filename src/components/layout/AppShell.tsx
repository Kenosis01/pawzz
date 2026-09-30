"use client";

import { useSidebar } from "../../lib/sidebar";
import { IncognitoProvider } from "../../lib/incognito";
import { ModelCatalogueProvider } from "../../lib/model-catalogue-context";
import { ConversationProvider } from "../../state/conversation";
import { PanelLeftOpenIcon } from "../icons/Icons";
import { Sidebar } from "./Sidebar";
import { Workbench, type WorkbenchTab } from "./Workbench";
import styles from "./AppShell.module.css";

/**
 * Persistent shell: sidebar + main workspace + optional workbench (spec §6).
 * Workbench tabs are threaded in by whichever workspace needs them; an empty
 * array keeps the panel collapsed and reserves no width.
 */
export function AppShell({
  children,
  workbenchTabs = [],
}: {
  children: React.ReactNode;
  workbenchTabs?: WorkbenchTab[];
}) {
  const sidebar = useSidebar();

  return (
    <IncognitoProvider>
      {/* Inside the shell rather than the root layout: the catalogue is only
          read by the composer, the settings tab and the chat route's client
          half, none of which exist on the bare routes (onboarding, a shared
          link). Fetching it there would be a request nobody reads. */}
      <ModelCatalogueProvider>
        <ConversationProvider>
          <div className={styles.shell}>
            <Sidebar {...sidebar} />

            <main className={styles.main}>
              {sidebar.collapsed ? (
                <button
                  type="button"
                  className={styles.reopen}
                  onClick={sidebar.toggle}
                  aria-label="Show sidebar"
                  title="Show sidebar"
                  data-icon-trigger
                >
                  <PanelLeftOpenIcon size={16} />
                </button>
              ) : null}
              {children}
            </main>

            <Workbench tabs={workbenchTabs} />
          </div>
        </ConversationProvider>
      </ModelCatalogueProvider>
    </IncognitoProvider>
  );
}
