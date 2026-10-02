import { SettingsSectionPage } from "~/screens/settings/SettingsSectionPage";

/**
 * Every registry section that shares one component. General and Appearance have
 * their own routes, so they are real files rather than entries in the dispatch
 * map; an id that is neither resolves to a 404 rather than a blank panel.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  return <SettingsSectionPage sectionId={sectionId} />;
}
