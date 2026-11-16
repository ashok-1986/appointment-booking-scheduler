import "dotenv/config";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { user, session, account, verification } from "./auth-schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  baseURL: {
    allowedHosts: ["localhost:*"],
    fallback: process.env.BETTER_AUTH_URL,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      partitioned: true,
    },
  },
  trustedOrigins: [
    "http://localhost:4000",
    "http://localhost:3000",
  ],
  secret: process.env.BETTER_AUTH_SECRET!,
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session["user"];