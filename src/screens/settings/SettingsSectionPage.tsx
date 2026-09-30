"use client";

import { notFound } from "next/navigation";

import { AboutSection } from "./sections/AboutSection";
import { ModelsSection } from "./sections/ModelsSection";
import {
  AgentsSection,
  ConnectionsSection,
  SubscriptionSection,
  UsageSection,
} from "./sections/PlaceholderSections";
import { PrivacySection } from "./sections/PrivacySection";
import { ShortcutsSection } from "./sections/ShortcutsSection";
import { settingsSections, type SettingsSectionId } from "./settingsSections";

/**
 * Every settings section except the two that ship as their own route (General →
 * AccountPage, Appearance → AppearancePage).
 *
 * Dispatched from the id rather than given a file each: `settingsSections` is
 * already the single source of truth for the nav, and a second file per section
 * would be a second place to forget to register one. Adding a section means
 * adding a row to the registry and an entry to the map below.
 *
 * An id that is not in the registry is a 404, not an empty page — otherwise a
 * typo in a link renders a blank panel that looks like a bug.
 */
/**
 * General and Appearance are excluded by type, not by convention: they ship as
 * their own route files, so an entry here would be unreachable dead code and the
 * compiler now says so if one is added by mistake.
 */
type Dispatched = Exclude<SettingsSectionId, "general" | "appearance">;

const SECTIONS: Record<Dispatched, () => React.JSX.Element> = {
  models: ModelsSection,
  connections: ConnectionsSection,
  agents: AgentsSection,
  usage: UsageSection,
  subscription: SubscriptionSection,
  privacy: PrivacySection,
  shortcuts: ShortcutsSection,
  about: AboutSection,
};

export function SettingsSectionPage({ sectionId }: { sectionId: string }) {
  // Unknown id — a stale link, a typo — is a 404 rather than an empty panel.
  // General and Appearance cannot land here: their routes are more specific and
  // win the match before this component is reached.
  const Section = Object.hasOwn(SECTIONS, sectionId)
    ? SECTIONS[sectionId as Dispatched]
    : null;
  if (!Section) notFound();
  return <Section />;
}

export { settingsSections };
