"use client";

import { notFound } from "next/navigation";

import { GeneralSection } from "./sections/GeneralSection";
import { MemorySection } from "./sections/MemorySection";
import { ModelsSection } from "./sections/ModelsSection";
import {
  AgentsSection,
  SubscriptionSection,
  UsageSection,
} from "./sections/PlaceholderSections";
import { settingsSections, type SettingsSectionId } from "./settingsSections";

/** Every registry id has a component here. Unknown id is a 404. */
type Dispatched = SettingsSectionId;

const SECTIONS: Record<Dispatched, () => React.JSX.Element> = {
  general: GeneralSection,
  memory: MemorySection,
  models: ModelsSection,
  usage: UsageSection,
  subscription: SubscriptionSection,
  agents: AgentsSection,
};

export function SettingsSectionPage({ sectionId }: { sectionId: string }) {
  const Section = Object.hasOwn(SECTIONS, sectionId)
    ? SECTIONS[sectionId as Dispatched]
    : null;
  if (!Section) notFound();
  return <Section />;
}

export { settingsSections };
