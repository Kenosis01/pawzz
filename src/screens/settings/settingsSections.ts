/**
 * Settings section registry. Data-only: the dialog sidebar and the route table
 * both read from this. Memory is its own section rather than a block inside
 * General — it is a document the user writes in, not a preference they toggle,
 * and a textarea squeezed into a settings row cannot be either.
 */
export const settingsSections = [
  { id: "general", label: "General" },
  { id: "memory", label: "Memory" },
  { id: "models", label: "Models" },
  { id: "usage", label: "Usage" },
  { id: "subscription", label: "Subscription" },
  { id: "agents", label: "Agents" },
] as const;

export type SettingsSectionId = (typeof settingsSections)[number]["id"];
