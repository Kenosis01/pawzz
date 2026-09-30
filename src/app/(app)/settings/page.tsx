import { redirect } from "next/navigation";

/**
 * `/settings` has no screen of its own — the sections are separate routes.
 *
 * It did need one: the profile menu navigates here, and with no page the request
 * 404'd, so choosing Settings from the profile menu did nothing at all. Landing
 * on Models because it is the only section with anything in it, rather than on
 * General, which is deliberately blank.
 */
export default function SettingsIndexPage() {
  redirect("/settings/models");
}
