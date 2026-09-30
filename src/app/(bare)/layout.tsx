/**
 * Routes that render outside the app shell. Onboarding (spec §131) and shared
 * threads both have to work for someone with no account and no sidebar.
 */
export default function BareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
