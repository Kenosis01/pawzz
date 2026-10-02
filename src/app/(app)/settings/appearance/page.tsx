import { redirect } from "next/navigation";

/** Appearance folded into General. */
export default function Page() {
  redirect("/settings/general");
}
