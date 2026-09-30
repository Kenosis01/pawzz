import { AppShell } from "~/components/layout/AppShell";

/**
 * The desktop route tree had AppShell as a react-router layout route wrapping
 * every authenticated page. The App Router nests by file, so that wrapper is
 * this layout and the pages sit underneath it.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
