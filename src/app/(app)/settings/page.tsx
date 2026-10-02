import { redirect } from "next/navigation";

/** `/settings` lands on General inside the dialog. */
export default function SettingsIndexPage() {
  redirect("/settings/general");
}
