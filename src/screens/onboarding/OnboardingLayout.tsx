"use client";

/** Onboarding runs outside the app shell — no sidebar, no workbench (spec §131). */
export function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
