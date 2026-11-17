import "dotenv/config";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { user, session, account, verification } from "./auth-schema";

const envAuthUrl =
  process.env.BETTER_AUTH_URL && !process.env.BETTER_AUTH_URL.includes("your-site-name")
    ? process.env.BETTER_AUTH_URL
    : undefined;
const resolvedBaseUrl =
  envAuthUrl ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.URL ||
  process.env.DEPLOY_PRIME_URL ||
  "https://book.meetprerna.com";

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
    allowedHosts: [
      "book.meetprerna.com",
      "*.meetprerna.com",
      "meetprerna.com",
      "bookmeetprerna.netlify.app",
      "*.netlify.app",
      "localhost:*",
      "127.0.0.1:*",
      "*.netlify.com",
    ],
    fallback: resolvedBaseUrl,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
  trustedOrigins: [
    "http://localhost:4000",
    "http://localhost:3000",
    "http://127.0.0.1:4000",
    "http://127.0.0.1:3000",
    "https://book.meetprerna.com",
    "https://*.meetprerna.com",
    "https://meetprerna.com",
    "https://bookmeetprerna.netlify.app",
    "https://*.netlify.app",
    "*.netlify.app",
    "https://*.netlify.com",
    "*.netlify.com",
    process.env.BETTER_AUTH_URL || "",
    process.env.NEXT_PUBLIC_APP_URL || "",
    process.env.URL || "",
    process.env.DEPLOY_PRIME_URL || "",
    process.env.DEPLOY_URL || "",
  ].filter(Boolean),
  secret: process.env.BETTER_AUTH_SECRET!,
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session["user"];