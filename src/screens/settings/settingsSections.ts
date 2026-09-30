/**
 * Settings section registry. Data-only: the nav and the route table both read
 * from this. `appearance` is the one section with a real page; the rest render
 * an empty surface until they are built.
 */
export const settingsSections = [
  { id: "general", label: "General" },
  { id: "appearance", label: "Appearance" },
  { id: "models", label: "Models" },
  { id: "connections", label: "Connections" },
  { id: "agents", label: "Agents" },
  { id: "usage", label: "Usage" },
  { id: "subscription", label: "Subscription" },
  { id: "privacy", label: "Privacy" },
  { id: "shortcuts", label: "Keyboard shortcuts" },
  { id: "about", label: "About" },
] as const;

export type SettingsSectionId = (typeof settingsSections)[number]["id"];
