import { SettingsLayout } from "~/screens/settings/SettingsLayout";

/** Settings shell: the section nav plus whatever section is open. */
export default function SettingsLayoutRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SettingsLayout>{children}</SettingsLayout>;
}
