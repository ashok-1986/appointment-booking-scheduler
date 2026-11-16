import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getSessionUser(reqHeaders?: Headers) {
  try {
    const h = reqHeaders || (await headers());
    const session = await auth.api.getSession({
      headers: h,
    });
    return session?.user ?? null;
  } catch (err) {
    console.error("getSessionUser error:", err);
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}