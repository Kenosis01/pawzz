import { redirect } from "next/navigation";

/** The app is the product. A marketing page can be added as its own route. */
export default function RootPage() {
  redirect("/chat");
}
