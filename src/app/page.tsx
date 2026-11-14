import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

// Middleware already routes authenticated users away from "/", but this
// server-side check keeps the page correct even if it's reached directly.
export default async function RootPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(session.role === "CEO" ? "/ceo/dashboard" : "/staff/my-day");
}
