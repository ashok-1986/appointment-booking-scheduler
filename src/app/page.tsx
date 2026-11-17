import { getSessionUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getSessionUser();
  redirect(user ? "/dashboard" : "/enquiry");
}