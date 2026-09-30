import { SettingsSectionPage } from "~/screens/settings/SettingsSectionPage";

/**
 * The eight sections that share one component. General and Appearance have their
 * own routes, so they are real files rather than entries in the dispatch map.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  return <SettingsSectionPage sectionId={sectionId} />;
}
