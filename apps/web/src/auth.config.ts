import type { NextAuthConfig } from "next-auth";
import type { Role } from "@newplace/config";

// Auth.js base URL: an explicit AUTH_URL (or legacy NEXTAUTH_URL) wins, otherwise the public APP_URL. Without either,
// Auth.js falls back to the request URL, which in the standalone server is the bind address (0.0.0.0:3000), not the
// public domain. Set here because both the Node handlers (auth.ts) and the edge middleware import this module, so
// they agree on the base URL and therefore on the (__Secure-) cookie names.
if (!process.env.AUTH_URL && !process.env.NEXTAUTH_URL && process.env.APP_URL) process.env.AUTH_URL = process.env.APP_URL;

/**
 * True for a session token minted by the password-less "demo" provider while DEMO_AUTH is now off: such a cookie
 * (e.g. a superadmin demo session from the preview) must not keep granting access after launch. Checked on every
 * token read, in the middleware (edge) and in the Node handlers.
 */
export const staleDemo = (token: Record<string, unknown>) => token.demo === true && process.env.DEMO_AUTH !== "true";

/** Edge-safe part of the Auth.js config (used by middleware). Providers live in auth.ts. */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/es/login" },
  providers: [],
  callbacks: {
    jwt({ token, user, account, trigger, session }) {
      if (staleDemo(token)) return null;
      if (user) {
        const u = user as { id: string; role?: Role; agencyId?: string | null; hue?: number };
        token.uid = u.id;
        token.role = u.role ?? "SEEKER";
        token.agencyId = u.agencyId ?? null;
        token.hue = u.hue ?? 200;
        if (account?.provider === "demo") token.demo = true;
      }
      // Only a superadmin may switch tenant (impersonation). The role is never taken from the client.
      if (trigger === "update" && token.role === "SUPERADMIN" && session && "agencyId" in session) {
        const next = (session as { agencyId?: unknown }).agencyId;
        if (next === null || typeof next === "string") token.agencyId = next;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = (token.role as Role) ?? "SEEKER";
      session.user.agencyId = (token.agencyId as string | null) ?? null;
      session.user.hue = (token.hue as number) ?? 200;
      return session;
    },
  },
} satisfies NextAuthConfig;
