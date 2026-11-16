import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-utils";

export default async function DashboardPage() {
  await requireUser();
  redirect("/dashboard/bookings");
}
